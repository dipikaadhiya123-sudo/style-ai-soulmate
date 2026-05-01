// Streaming AI stylist chat with profile context
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limited" }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!aiResp.ok) {
      console.error("AI error", aiResp.status, await aiResp.text());
      return json({ error: "AI gateway error" }, 500);
    }

    return new Response(aiResp.body, {
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
