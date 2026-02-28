import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { AiProvider, ChatMessage } from './ai-provider.interface';

@Injectable()
export class BedrockProvider implements AiProvider {
  private readonly logger = new Logger(BedrockProvider.name);
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new BedrockRuntimeClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
    });
    this.modelId = this.configService.get<string>(
      'BEDROCK_MODEL_ID',
      'anthropic.claude-3-haiku-20240307-v1:0',
    );
  }

  async chat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    // Separate system prompt from messages
    const systemPrompts = messages.filter((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (systemPrompts.length > 0) {
      body.system = systemPrompts.map((s) => s.content).join('\n');
    }

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body),
    );

    return responseBody.content?.[0]?.text || '';
  }

  async checkHealth(): Promise<{ status: string; provider: string; model: string }> {
    try {
      // Simple test to check credentials and connectivity
      await this.chat(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 5 },
      );
      return { status: 'healthy', provider: 'bedrock', model: this.modelId };
    } catch {
      return { status: 'unavailable', provider: 'bedrock', model: this.modelId };
    }
  }
}
