import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, ChatMessage } from './ai-provider.interface';

@Injectable()
export class OllamaProvider implements AiProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('OLLAMA_BASE_URL', 'http://ollama:11434');
    this.model = this.configService.get('OLLAMA_MODEL', 'llama3.2');
  }

  async chat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          ...(options?.maxTokens && { num_predict: options.maxTokens }),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.message?.content || '';
  }

  async checkHealth(): Promise<{ status: string; provider: string; model: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        provider: 'ollama',
        model: this.model,
      };
    } catch {
      return { status: 'unavailable', provider: 'ollama', model: this.model };
    }
  }
}
