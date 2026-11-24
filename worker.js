
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405, headers: corsHeaders }
        );
      }

      try {
        const body = await request.json();
        const message = body.message;

        if (typeof message !== "string" || !message.trim()) {
          return Response.json(
            { error: "Please enter a message" },
            { status: 400, headers: corsHeaders }
          );
        }

        if (message.length > 4000) {
          return Response.json(
            { error: "Message is too long" },
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct",
          {
            messages: [
              {
                role: "system",
                content: "You are VRPAIData AI, a helpful and friendly AI assistant. Reply clearly and accurately."
              },
              {
                role: "user",
                content: message.trim()
              }
            ]
          }
        );

        return Response.json(
          { reply: result.response || "No response received." },
          { headers: corsHeaders }
        );

      } catch (error) {
        return Response.json(
          { error: "AI service error. Please try again later." },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
