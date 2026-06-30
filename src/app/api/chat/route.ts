import { NextResponse } from 'next/server';
import { retrieveContext } from '@/lib/rag/retriever';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { query, gameId, minSimilarity, history } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    if (!gameId) {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 });
    }

    // 1. Retrieve the context
    // Default limit is 3. We can pass a customized threshold from the client.
    const contextChunks = await retrieveContext(query, gameId, { 
      minSimilarity: typeof minSimilarity === 'number' ? minSimilarity : 0.3,
      limit: 4 // Get up to 4 relevant context chunks
    });

    // 2. Build context text for prompt insertion
    const contextText = contextChunks
      .map((c, i) => `[Source ${i + 1}]: File: ${c.fileName}, Section: ${c.heading}\nContent:\n${c.text}`)
      .join('\n\n');

    // 3. Setup system instructions
    const systemInstruction = `You are a professional game strategy assistant. Answer the user's question about the game using the provided strategy guide/lore manual context below. 
Always support your statements with facts from the context. If the context doesn't contain enough information to answer the question, state that clearly but provide a helpful general answer based on your knowledge base.
Be concise, accurate, and helpful. Maintain a polite and structured tone. Refer to the sources by their index (e.g. [Source 1], [Source 2]).

Here is the retrieved context:
${contextText || "No context was found for this query within the strategy guide."}`;

    // Prepare contents array for Gemini chat history
    const contents: any[] = [];

    // Add history if present
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        // Skip system/metadata messages and make sure format matches Gemini API (user / model)
        if (msg.role === 'user' || msg.role === 'assistant') {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        }
      }
    }

    // Add current query
    contents.push({
      role: 'user',
      parts: [{ text: query }]
    });

    const ai = getGeminiClient();

    // 4. Generate the streaming response
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
      }
    });

    // 5. Create a ReadableStream to stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Enqueue the JSON metadata chunk as the first line so the frontend knows what was retrieved.
        const metadataString = `METADATA:${JSON.stringify(contextChunks.map(c => ({
          fileName: c.fileName,
          heading: c.heading,
          text: c.text,
          similarity: c.similarity
        })))}\n\n`;
        controller.enqueue(encoder.encode(metadataString));

        try {
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          console.error("Error during streaming generation:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });

  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
