import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { Asset } from '../assets/entities/asset.entity';
import {
  AiTaskType,
  AiQueryDto,
  AiChatDto,
  AiSummarizeWoDto,
  AiFailurePredictionDto,
  AiMaintenanceRecommendationDto,
  AiTroubleshootDto,
} from './dto';

interface ConversationContext {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  lastUsed: Date;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ollamaBaseUrl: string;
  private readonly defaultModel: string;
  private conversationCache = new Map<string, ConversationContext>();

  constructor(
    private configService: ConfigService,
    @InjectRepository(WorkOrder)
    private workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
  ) {
    this.ollamaBaseUrl = this.configService.get('OLLAMA_BASE_URL', 'http://ollama:11434');
    this.defaultModel = this.configService.get('OLLAMA_MODEL', 'llama3.2');
  }

  private async callOllama(
    prompt: string,
    systemPrompt?: string,
    temperature = 0.7,
  ): Promise<string> {
    try {
      const messages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          messages,
          stream: false,
          options: { temperature },
        }),
      });

      if (!response.ok) {
        throw new HttpException('AI service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const data = await response.json() as any;
      return data.message?.content || '';
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Ollama error: ${error?.message || 'Unknown'}`);
      throw new HttpException('AI service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async processQuery(dto: AiQueryDto): Promise<{ result: string; taskType: AiTaskType }> {
    switch (dto.taskType) {
      case AiTaskType.SUMMARIZE_WO:
        if (!dto.workOrderId) {
          throw new HttpException('workOrderId required', HttpStatus.BAD_REQUEST);
        }
        return {
          result: await this.summarizeWorkOrder({ workOrderId: dto.workOrderId }),
          taskType: dto.taskType,
        };

      case AiTaskType.FAILURE_PREDICTION:
        if (!dto.assetId) {
          throw new HttpException('assetId required', HttpStatus.BAD_REQUEST);
        }
        return {
          result: await this.predictFailure({ assetId: dto.assetId }),
          taskType: dto.taskType,
        };

      case AiTaskType.MAINTENANCE_RECOMMENDATION:
        if (!dto.assetId) {
          throw new HttpException('assetId required', HttpStatus.BAD_REQUEST);
        }
        return {
          result: await this.getMaintenanceRecommendation({ assetId: dto.assetId, symptoms: dto.query }),
          taskType: dto.taskType,
        };

      case AiTaskType.TROUBLESHOOT:
        if (!dto.query) {
          throw new HttpException('query required', HttpStatus.BAD_REQUEST);
        }
        return {
          result: await this.troubleshoot({ assetId: dto.assetId, problemDescription: dto.query }),
          taskType: dto.taskType,
        };

      default:
        if (!dto.query) {
          throw new HttpException('query required', HttpStatus.BAD_REQUEST);
        }
        return {
          result: await this.processNaturalLanguageQuery(dto.query),
          taskType: AiTaskType.NATURAL_LANGUAGE_QUERY,
        };
    }
  }

  async chat(dto: AiChatDto): Promise<{ response: string; conversationId: string }> {
    const conversationId = dto.conversationId || `conv_${Date.now()}`;
    let context = this.conversationCache.get(conversationId);

    if (!context) {
      context = {
        messages: [{
          role: 'system',
          content: 'You are a CMMS AI assistant helping with maintenance management.',
        }],
        lastUsed: new Date(),
      };
    }

    context.messages.push({ role: 'user', content: dto.message });

    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: context.messages,
          stream: false,
          options: { temperature: dto.temperature ?? 0.7 },
        }),
      });

      if (!response.ok) {
        throw new HttpException('AI service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const data = await response.json() as any;
      const assistantMessage = data.message?.content || '';

      context.messages.push({ role: 'assistant', content: assistantMessage });
      context.lastUsed = new Date();
      this.conversationCache.set(conversationId, context);

      return { response: assistantMessage, conversationId };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('AI service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async summarizeWorkOrder(dto: AiSummarizeWoDto): Promise<string> {
    const wo = await this.workOrderRepo.findOne({
      where: { id: dto.workOrderId },
      relations: ['asset'],
    });

    if (!wo) {
      throw new HttpException('Work order not found', HttpStatus.NOT_FOUND);
    }

    const prompt = `Summarize this maintenance work order:
Work Order: ${wo.woNumber}
Type: ${wo.type}
Priority: ${wo.priority}
Status: ${wo.status}
Asset: ${wo.asset?.name || 'N/A'}
Title: ${wo.title}
Description: ${wo.description || 'No description'}

Provide a brief 2-3 sentence summary.`;

    return this.callOllama(prompt, 'You are a maintenance management assistant.', 0.3);
  }

  async predictFailure(dto: AiFailurePredictionDto): Promise<string> {
    const asset = await this.assetRepo.findOne({
      where: { id: dto.assetId },
      relations: ['category'],
    });

    if (!asset) {
      throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);
    }

    const recentWOs = await this.workOrderRepo.find({
      where: { assetId: dto.assetId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const prompt = `Analyze maintenance history and predict failures:
Asset: ${asset.name} (${asset.assetNumber})
Category: ${asset.category?.name || 'Unknown'}
Status: ${asset.status}

Recent Work Orders: ${recentWOs.length} in history
${recentWOs.map(wo => `- ${wo.type}: ${wo.title}`).join('\n')}

Predict likely failures and recommend preventive actions.`;

    return this.callOllama(prompt, 'You are a predictive maintenance analyst.', 0.5);
  }

  async getMaintenanceRecommendation(dto: AiMaintenanceRecommendationDto): Promise<string> {
    const asset = await this.assetRepo.findOne({
      where: { id: dto.assetId },
      relations: ['category'],
    });

    if (!asset) {
      throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);
    }

    const prompt = `Provide maintenance recommendations:
Asset: ${asset.name} (${asset.assetNumber})
Category: ${asset.category?.name || 'General Equipment'}
Manufacturer: ${asset.manufacturer || 'Unknown'}
Model: ${asset.model || 'Unknown'}
${dto.symptoms ? `Symptoms: ${dto.symptoms}` : ''}

Recommend inspection items, maintenance tasks, and safety precautions.`;

    return this.callOllama(prompt, 'You are a maintenance expert.', 0.4);
  }

  async troubleshoot(dto: AiTroubleshootDto): Promise<string> {
    let assetContext = '';
    
    if (dto.assetId) {
      const asset = await this.assetRepo.findOne({
        where: { id: dto.assetId },
        relations: ['category'],
      });
      
      if (asset) {
        assetContext = `Asset: ${asset.name} (${asset.assetNumber})\nCategory: ${asset.category?.name || 'Unknown'}`;
      }
    }

    const prompt = `Troubleshoot this issue:
Problem: ${dto.problemDescription}
${dto.errorCodes ? `Error Codes: ${dto.errorCodes}` : ''}
${assetContext}

Provide step-by-step troubleshooting guide with safety precautions.`;

    return this.callOllama(prompt, 'You are a maintenance troubleshooting assistant.', 0.4);
  }

  async processNaturalLanguageQuery(query: string): Promise<string> {
    return this.callOllama(
      query,
      'You are a CMMS assistant. Answer maintenance-related questions concisely.',
      0.6
    );
  }

  async checkHealth(): Promise<{ status: string; model: string }> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      return { status: response.ok ? 'healthy' : 'unhealthy', model: this.defaultModel };
    } catch {
      return { status: 'unavailable', model: this.defaultModel };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json() as any;
        return data.models?.map((m: any) => m.name) || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  clearConversation(conversationId: string): boolean {
    return this.conversationCache.delete(conversationId);
  }
}
