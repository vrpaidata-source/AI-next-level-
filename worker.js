export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
      }

      try {
        const authorization = request.headers.get("Authorization") || "";
        const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

        if (!tokenMatch) {
          return Response.json({ error: "Please log in to use VRPAIData AI." }, { status: 401 });
        }

        if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
          console.error("Supabase environment variables are missing.");
          return Response.json({ error: "Authentication service is not configured." }, { status: 500 });
        }

        const authResponse = await fetch(
          env.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/user",
          {
            method: "GET",
            headers: {
              "apikey": env.SUPABASE_PUBLISHABLE_KEY,
              "Authorization": "Bearer " + tokenMatch[1]
            }
          }
        );

        if (!authResponse.ok) {
          return Response.json(
            { error: "Your session is invalid or expired. Please log in again." },
            { status: 401 }
          );
        }

        const user = await authResponse.json();
        if (!user || !user.id) {
          return Response.json({ error: "Unable to verify your account." }, { status: 401 });
        }

        if (!env.AI) throw new Error("Workers AI binding is missing");

        const body = await request.json();
        const message = body.message;

        if (typeof message !== "string" || !message.trim()) {
          return Response.json({ error: "Please enter a message." }, { status: 400 });
        }
        if (message.length > 4000) {
          return Response.json({ error: "Message is too long. Maximum 4,000 characters." }, { status: 400 });
        }

        const result = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
          messages: [
            {
              role: "system",
              content: "You are VRPAIData AI, a friendly and helpful assistant. Reply in the same language as the user."
            },
            { role: "user", content: message.trim() }
          ],
          chat_template_kwargs: { enable_thinking: false },
          max_tokens: 1024
        });

        const reply =
          result?.choices?.[0]?.message?.content ??
          result?.response ??
          result?.output_text ??
          "";

        if (typeof reply !== "string" || !reply.trim()) {
          console.error("Unexpected AI response shape.");
          return Response.json({ error: "The AI did not return a response. Please try again." }, { status: 502 });
        }

        return Response.json({ success: true, reply: reply.trim() });
      } catch (error) {
        console.error("VRPAIData AI request failed:", error);
        return Response.json(
          { error: "AI service is temporarily unavailable. Please try again." },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
