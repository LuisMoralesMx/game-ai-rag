import { GoogleGenAI } from '@google/genai';

let clientInstance: GoogleGenAI | null = null;

/**
 * Returns a singleton instance of the GoogleGenAI client.
 * Throws an error if the GEMINI_API_KEY environment variable is missing.
 */
export function getGeminiClient(): GoogleGenAI {
  if (clientInstance) {
    return clientInstance;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not defined.');
  }

  clientInstance = new GoogleGenAI({ apiKey });
  return clientInstance;
}
