export interface GameData {
  id: string;
  name: string;
  desc: string;
  files: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    fileName: string;
    heading: string;
    text: string;
    similarity: number;
  }[];
}
