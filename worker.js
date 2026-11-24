
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
          throw new Error("AI binding not found");
        }

        const body = await request.json();
        const message = body.message;

        if (typeof message !== "string" || !message.trim()) {
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
                  "You are VRPAIData AI, a friendly intelligent assistant. Reply in the same language as the user."
              },
              {
                role: "user",
                content: message.trim()
              }
            ],
            chat_template_kwargs: {
              enable_thinking: false
            },
            max_tokens: 1024
          }
        );

        console.log("AI result:", JSON.stringify(result));

        const reply =
          result?.choices?.[0]?.message?.content ??
          result?.response ??
          result?.output_text ??
          "";

        if (typeof reply !== "string" || !reply.trim()) {
          throw new Error("AI response format was empty or unexpected");
        }

        return Response.json({
          success: true,
          reply: reply.trim()
        });

      } catch (error) {
        console.error("VRPAIData AI Error:", error);

        return Response.json(
          {
            error: "AI Error: " + (error.message || "Unknown error")
          },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
