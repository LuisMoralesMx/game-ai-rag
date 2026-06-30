import { getGeminiClient } from '@/lib/gemini';
import { getEmbeddings, EmbeddedChunk } from './embedder';

export interface RetrievalResult extends EmbeddedChunk {
  similarity: number;
}

// Dot product of two vectors (if they are normalized, this equals cosine similarity)
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector lengths do not match: ${vecA.length} vs ${vecB.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieve the top matching chunks for a user query.
 */
export async function retrieveContext(
  query: string,
  gameId: string,
  options: {
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<RetrievalResult[]> {
  const limit = options.limit ?? 3;
  const minSimilarity = options.minSimilarity ?? 0.3;

  // Generate embedding for the search query
  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: query,
  });

  let queryVector: number[] | undefined;
  const resObj = response as any;
  if (resObj.embedding?.values) {
    queryVector = resObj.embedding.values;
  } else if (resObj.embeddings?.[0]?.values) {
    queryVector = resObj.embeddings[0].values;
  }

  if (!queryVector) {
    throw new Error('Failed to generate embedding for query');
  }

  // Load all cached embeddings
  const allChunks = await getEmbeddings();

  // Filter chunks by gameId (scope the RAG context)
  const gameChunks = allChunks.filter(chunk => chunk.gameId === gameId);

  if (gameChunks.length === 0) {
    console.warn(`No embedded chunks found for game: ${gameId}`);
    return [];
  }

  // Calculate similarity for each chunk
  const scoredChunks: RetrievalResult[] = gameChunks.map(chunk => {
    const similarity = calculateCosineSimilarity(queryVector!, chunk.vector);
    return {
      ...chunk,
      similarity,
    };
  });

  // Filter by threshold and sort by highest similarity
  const results = scoredChunks
    .filter(chunk => chunk.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}
