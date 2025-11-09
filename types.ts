export type Role = 'user' | 'model';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  image?: {
    data: string; // base64 encoded
    mimeType: string;
  };
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  messages: ChatMessage[];
}