import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import { retrieveRelevantPreferences, generateEmbedding } from "@/lib/rag";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge"; // Use Edge runtime for streaming

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { message, history = [] } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate embedding for the message to find relevant preferences
    const messageEmbedding = await generateEmbedding(message);

    // Retrieve relevant preferences
    const relevantPreferences = await retrieveRelevantPreferences(
      session.user.id,
      messageEmbedding,
      5
    );

    const preferenceContext = relevantPreferences
      .map(
        (p) =>
          `${p.preferenceType}: ${p.value} (strength: ${p.strength.toFixed(2)}, relevance: ${p.similarity.toFixed(2)})`
      )
      .join("\n");

    const systemPrompt = `You are CineMate AI, a friendly and knowledgeable movie companion. You help users discover movies based on their preferences.

User's preferences (with relevance to current conversation):
${preferenceContext}

Be conversational, enthusiastic, and provide specific movie recommendations when appropriate. Use the preferences to personalize your responses.`;

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      temperature: 0.9,
      max_tokens: 500,
      stream: true,
    });

    // Create a TransformStream to convert OpenAI stream to Response stream
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          // Send done message
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Streaming chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process chat message" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

