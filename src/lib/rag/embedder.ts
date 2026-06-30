import fs from 'fs';
import path from 'path';
import { getGeminiClient } from '@/lib/gemini';

// Define the chunk structure
export interface EmbeddedChunk {
  gameId: string; // e.g. "hollow_knight"
  fileName: string; // e.g. "hollow_knight.md"
  heading: string; // e.g. "Pale Ore Locations"
  text: string; // The markdown content under this section
  vector: number[]; // The 768-dimension embedding vector
}

const CACHE_PATH = path.join(process.cwd(), 'src/data/embeddings-cache.json');
const GAMES_DIR = path.join(process.cwd(), 'src/data/games');

/**
 * Split a markdown string into chunks based on headings.
 * Each chunk starts with a heading (#, ##, ###, etc.) and contains the text until the next heading.
 */
export function chunkMarkdown(filename: string, content: string): { heading: string; text: string }[] {
  const lines = content.split('\n');
  const chunks: { heading: string; text: string }[] = [];
  
  let currentHeading = 'General Information';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      // Save the previous chunk if it has content
      if (currentLines.length > 0) {
        const text = currentLines.join('\n').trim();
        if (text) {
          chunks.push({ heading: currentHeading, text });
        }
      }
      
      currentHeading = headingMatch[2].trim();
      currentLines = [line]; // Include the heading in the text for richer semantic representation
    } else {
      currentLines.push(line);
    }
  }

  // Add the last chunk
  if (currentLines.length > 0) {
    const text = currentLines.join('\n').trim();
    if (text) {
      chunks.push({ heading: currentHeading, text });
    }
  }

  return chunks;
}

/**
 * Generate and cache embeddings for all markdown files in the games data directory.
 */
export async function buildEmbeddingsCache(forceRegen = false): Promise<EmbeddedChunk[]> {
  // Check if cache already exists and we are not forcing regeneration
  if (!forceRegen && fs.existsSync(CACHE_PATH)) {
    try {
      const cacheData = fs.readFileSync(CACHE_PATH, 'utf-8');
      return JSON.parse(cacheData) as EmbeddedChunk[];
    } catch (e) {
      console.error('Error reading embeddings cache, regenerating...', e);
    }
  }

  console.log('Building embeddings cache...');
  const ai = getGeminiClient();
  const allEmbeddedChunks: EmbeddedChunk[] = [];

  if (!fs.existsSync(GAMES_DIR)) {
    console.error(`Games directory not found at ${GAMES_DIR}`);
    return [];
  }

  const files = fs.readdirSync(GAMES_DIR).filter(file => file.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(GAMES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const gameId = path.basename(file, '.md');
    
    console.log(`Processing file: ${file} (Game: ${gameId})`);
    
    const textChunks = chunkMarkdown(file, content);
    
    for (const chunk of textChunks) {
      const combinedText = `Game: ${gameId.replace('_', ' ')}\nSection: ${chunk.heading}\nContent:\n${chunk.text}`;
      console.log(`Generating embedding for section: "${chunk.heading}" (${combinedText.length} chars)`);

      try {
        const response = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: combinedText,
        });

        // The SDK returns response.embedding.values or response.embeddings[0].values
        let vector: number[] | undefined;
        const resObj = response as any;
        if (resObj.embedding?.values) {
          vector = resObj.embedding.values;
        } else if (resObj.embeddings?.[0]?.values) {
          vector = resObj.embeddings[0].values;
        }

        if (!vector) {
          console.error(`Failed to get embedding vector for section: "${chunk.heading}"`);
          continue;
        }

        allEmbeddedChunks.push({
          gameId,
          fileName: file,
          heading: chunk.heading,
          text: chunk.text,
          vector,
        });
      } catch (err) {
        console.error(`Error generating embedding for section: "${chunk.heading}" in file ${file}:`, err);
      }
    }
  }

  // Ensure directories exist
  const cacheDir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Write to cache file
  fs.writeFileSync(CACHE_PATH, JSON.stringify(allEmbeddedChunks, null, 2), 'utf-8');
  console.log(`Successfully generated and cached ${allEmbeddedChunks.length} chunks to ${CACHE_PATH}`);

  return allEmbeddedChunks;
}

/**
 * Loads the embeddings from cache or runs the build process if missing.
 */
export async function getEmbeddings(): Promise<EmbeddedChunk[]> {
  if (fs.existsSync(CACHE_PATH)) {
    try {
      const cacheData = fs.readFileSync(CACHE_PATH, 'utf-8');
      return JSON.parse(cacheData) as EmbeddedChunk[];
    } catch (e) {
      console.error('Error loading cache, rebuilding...', e);
    }
  }
  return await buildEmbeddingsCache();
}
