import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, ChatMessage } from './ai-provider.interface';

/**
 * Anthropic (Claude) provider using the public Messages API over fetch — no
 * SDK dependency, mirroring the OllamaProvider's transport style and reusing
 * the same message body shape the BedrockProvider already builds. This is the
 * lowest-friction way to make the AI assistant work in a hosted deployment
 * (Railway): set ANTHROPIC_API_KEY and the module auto-selects this provider.
 */
@Injectable()
export class AnthropicProvider implements AiProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY', '');
    this.model = this.configService.get<string>('ANTHROPIC_MODEL', 'claude-3-5-haiku-latest');
    if (!this.apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY is not set — AI requests will fail until it is configured.');
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    // Claude takes the system prompt as a separate top-level field, not a message.
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        ...(system ? { system } : {}),
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Anthropic error ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await response.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text || '';
  }

  async checkHealth(): Promise<{ status: string; provider: string; model: string }> {
    if (!this.apiKey) {
      return { status: 'unavailable', provider: 'anthropic', model: this.model };
    }
    try {
      await this.chat([{ role: 'user', content: 'ping' }], { maxTokens: 5 });
      return { status: 'healthy', provider: 'anthropic', model: this.model };
    } catch {
      return { status: 'unavailable', provider: 'anthropic', model: this.model };
    }
  }
}
