export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EdgeHandler = (req: Request) => Response | Promise<Response>;

export function withCors(handler: EdgeHandler): EdgeHandler {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const response = await handler(req);
      const headers = new Headers(response.headers);
      new Headers(corsHeaders).forEach((value, key) => headers.set(key, value));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error("Unhandled Edge Function error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  };
}