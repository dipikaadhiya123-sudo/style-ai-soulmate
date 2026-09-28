// Streaming AI stylist chat with profile context
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { geminiStreamAsOpenAiSse } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);

    const { messages } = await req.json();
    if (!Array.isArray(messages)) return json({ error: "messages must be array" }, 400);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, gender, height_cm, weight_kg, skin_tone, hair_type, body_shape, style_prefs, ai_analysis")
      .eq("id", u.user.id)
      .maybeSingle();

    const profileLines = profile
      ? Object.entries(profile)
          .filter(([_, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
          .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join("\n")
      : "(no profile yet)";

    const system = `You are StyleAI, a warm, expert personal stylist. Your tone is calm, confident, and specific — never preachy.

User profile:
${profileLines}

Guidelines:
- Reference the user's body, skin, and style prefs when relevant.
- Recommend specific items (e.g. "a charcoal merino crewneck") with colors.
- Use markdown lists for outfit suggestions.
- Keep replies focused and conversational.`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY not configured" }, 500);

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const stream = geminiStreamAsOpenAiSse({ apiKey: GEMINI_API_KEY, system, contents });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
