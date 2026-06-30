import { buildEmbeddingsCache } from '../lib/rag/embedder';
import { retrieveContext } from '../lib/rag/retriever';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function runTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY environment variable is not defined.');
    console.error('Please add GEMINI_API_KEY=your_key to a .env.local file in the project root.');
    process.exit(1);
  }

  console.log('--- 1. Rebuilding Cache ---');
  try {
    // Force rebuild of cache to ensure everything works
    const chunks = await buildEmbeddingsCache(true);
    console.log(`Successfully indexed ${chunks.length} chunks.`);
  } catch (error) {
    console.error('Error building embeddings cache:', error);
    process.exit(1);
  }

  console.log('\n--- 2. Testing Retrieval: Hollow Knight ---');
  try {
    const query = 'How do I upgrade the Nail and where is the Nailsmith?';
    console.log(`Query: "${query}"`);
    
    const results = await retrieveContext(query, 'hollow_knight', {
      limit: 2,
      minSimilarity: 0.3
    });

    console.log(`Found ${results.length} matching chunks:`);
    results.forEach((chunk, i) => {
      console.log(`\nMatch #${i + 1} (Similarity: ${chunk.similarity.toFixed(4)}):`);
      console.log(`Section: "${chunk.heading}"`);
      console.log(`Source File: ${chunk.fileName}`);
      console.log(`--- Content Preview ---`);
      console.log(chunk.text.substring(0, 200) + '...');
      console.log(`-----------------------`);
    });
  } catch (error) {
    console.error('Error during Hollow Knight retrieval test:', error);
  }

  console.log('\n--- 3. Testing Retrieval: Expedition 33 ---');
  try {
    const query = 'Who are the members of Expedition 33?';
    console.log(`Query: "${query}"`);
    
    const results = await retrieveContext(query, 'expedition_33', {
      limit: 2,
      minSimilarity: 0.3
    });

    console.log(`Found ${results.length} matching chunks:`);
    results.forEach((chunk, i) => {
      console.log(`\nMatch #${i + 1} (Similarity: ${chunk.similarity.toFixed(4)}):`);
      console.log(`Section: "${chunk.heading}"`);
      console.log(`Source File: ${chunk.fileName}`);
      console.log(`--- Content Preview ---`);
      console.log(chunk.text.substring(0, 200) + '...');
      console.log(`-----------------------`);
    });
  } catch (error) {
    console.error('Error during Expedition 33 retrieval test:', error);
  }
}

runTest();
