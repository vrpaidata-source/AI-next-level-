
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405 }
        );
      }

      try {
        if (!env.AI) {
          throw new Error("Workers AI binding is missing");
        }

        const body = await request.json();
        const message = body.message;

        if (
          typeof message !== "string" ||
          !message.trim()
        ) {
          return Response.json(
            { error: "Please enter a message" },
            { status: 400 }
          );
        }

        if (message.length > 4000) {
          return Response.json(
            { error: "Message is too long" },
            { status: 400 }
          );
        }

        const result = await env.AI.run(
          "@cf/google/gemma-4-26b-a4b-it",
          {
            messages: [
              {
                role: "system",
                content:
                  "You are VRPAIData AI, a helpful and intelligent assistant. Reply clearly in the language used by the user."
              },
              {
                role: "user",
                content: message.trim()
              }
            ]
          }
        );

        const reply = result?.response;

        if (!reply) {
          console.error("Empty AI response:", result);

          return Response.json(
            { error: "AI returned an empty response" },
            { status: 502 }
          );
        }

        return Response.json({ reply });

      } catch (error) {
        console.error("VRPAIData AI Error:", error);

        return Response.json(
          {
            error: "AI service error. Please check Cloudflare Worker Logs."
          },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
