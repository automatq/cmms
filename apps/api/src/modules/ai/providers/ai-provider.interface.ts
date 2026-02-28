export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiProvider {
  /**
   * Send a chat completion request with a list of messages.
   */
  chat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string>;

  /**
   * Check if the provider is healthy / reachable.
   */
  checkHealth(): Promise<{ status: string; provider: string; model: string }>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
