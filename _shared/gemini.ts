// Shared helper for calling Google's Gemini API directly (no Lovable dependency).
// Requires the GEMINI_API_KEY secret to be set on the Supabase project.
// Get a key at https://aistudio.google.com/apikey

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Fetch a URL (signed storage URL, public image URL, etc.) and return it as base64 + mime, ready for inlineData. */
export async function fetchAsInlineData(url: string): Promise<{ mimeType: string; data: string }> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch image (${r.status}): ${url}`);
  const mimeType = r.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return { mimeType, data: btoa(bin) };
}

/** Strip fields Gemini's schema parser doesn't accept (additionalProperties, unions in "type"). */
function sanitizeSchema(schema: any): any {
  if (Array.isArray(schema)) return schema.map(sanitizeSchema);
  if (schema && typeof schema === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === "additionalProperties") continue;
      if (k === "type" && Array.isArray(v)) {
        out.type = v.find((t) => t !== "null") ?? v[0];
        continue;
      }
      out[k] = sanitizeSchema(v);
    }
    return out;
  }
  return schema;
}

/**
 * Call Gemini for a single structured-JSON response (replaces the old
 * tool_choice / tool_calls pattern from the Lovable/OpenAI-style gateway).
 */
export async function geminiStructured(opts: {
  apiKey: string;
  model?: string;
  system?: string;
  parts: GeminiPart[];
  schema: any;
}): Promise<any> {
  const model = opts.model ?? "gemini-2.5-flash";
  const body: any = {
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: sanitizeSchema(opts.schema),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const resp = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${opts.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (resp.status === 429) throw new GeminiError("Rate limited, try again shortly", 429);
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("Gemini error", resp.status, t);
    throw new GeminiError("AI generation failed", 500);
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  if (!text) throw new GeminiError("No response returned", 500);
  try {
    return JSON.parse(text);
  } catch {
    console.error("Bad JSON from Gemini:", text.slice(0, 500));
    throw new GeminiError("AI returned invalid output", 500);
  }
}

/** Plain-text (non-JSON) single response, e.g. for descriptions. */
export async function geminiText(opts: {
  apiKey: string;
  model?: string;
  system?: string;
  parts: GeminiPart[];
}): Promise<string> {
  const model = opts.model ?? "gemini-2.5-flash";
  const body: any = { contents: [{ role: "user", parts: opts.parts }] };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const resp = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${opts.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (resp.status === 429) throw new GeminiError("Rate limited, try again shortly", 429);
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("Gemini error", resp.status, t);
    throw new GeminiError("AI generation failed", 500);
  }
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
}

/**
 * Streaming chat, re-emitted as OpenAI-compatible SSE
 * (`data: {"choices":[{"delta":{"content":"..."}}]}`) so existing
 * frontend stream-parsing code keeps working unchanged.
 */
export function geminiStreamAsOpenAiSse(opts: {
  apiKey: string;
  model?: string;
  system?: string;
  contents: { role: string; parts: GeminiPart[] }[];
}): ReadableStream<Uint8Array> {
  const model = opts.model ?? "gemini-2.5-flash";
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const body: any = { contents: opts.contents };
        if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

        const resp = await fetch(
          `${GEMINI_BASE}/${model}:streamGenerateContent?alt=sse&key=${opts.apiKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
        );

        if (!resp.ok || !resp.body) {
          const t = await resp.text().catch(() => "");
          console.error("Gemini stream error", resp.status, t);
          const msg = resp.status === 429 ? "Rate limited" : "AI gateway error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const line = chunk.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const parsed = JSON.parse(payload);
              const text = parsed.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`),
                );
              }
            } catch {
              // ignore partial/non-JSON lines
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        console.error("stream failed", e);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`));
        controller.close();
      }
    },
  });
}

/** Image generation/editing (virtual try-on). Returns raw bytes + mime of the produced image. */
export async function geminiImageEdit(opts: {
  apiKey: string;
  model?: string;
  parts: GeminiPart[];
}): Promise<{ mime: string; bytes: Uint8Array }> {
  const model = opts.model ?? "gemini-2.5-flash-image";
  const resp = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${opts.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: opts.parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });

  if (resp.status === 429) throw new GeminiError("Rate limited, try again shortly", 429);
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("Gemini image error", resp.status, t);
    throw new GeminiError("Image generation failed", 500);
  }

  const data = await resp.json();
  const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!imgPart?.inlineData?.data) {
    console.error("No image returned", JSON.stringify(data).slice(0, 500));
    throw new GeminiError("No image returned", 500);
  }
  const mime = imgPart.inlineData.mimeType || "image/png";
  const bytes = Uint8Array.from(atob(imgPart.inlineData.data), (c) => c.charCodeAt(0));
  return { mime, bytes };
}

