import { Injectable, Logger, HttpException, HttpStatus, Inject } from '@nestjs/common';
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
import { AiProvider, AI_PROVIDER, ChatMessage } from './providers/ai-provider.interface';

interface ConversationContext {
  messages: ChatMessage[];
  lastUsed: Date;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private conversationCache = new Map<string, ConversationContext>();

  constructor(
    @Inject(AI_PROVIDER)
    private readonly provider: AiProvider,
    @InjectRepository(WorkOrder)
    private workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
  ) {}

  private async callAi(
    prompt: string,
    systemPrompt?: string,
    temperature = 0.7,
  ): Promise<string> {
    try {
      const messages: ChatMessage[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      return await this.provider.chat(messages, { temperature });
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`AI provider error: ${error?.message || 'Unknown'}`);
      throw new HttpException('AI service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async processQuery(dto: AiQueryDto, tenantId: string): Promise<{ result: string; taskType: AiTaskType }> {
    switch (dto.taskType) {
      case AiTaskType.SUMMARIZE_WO:
        if (!dto.workOrderId) {
          throw new HttpException('workOrderId required', HttpStatus.BAD_REQUEST);
        }
        return {
          result: await this.summarizeWorkOrder({ workOrderId: dto.workOrderId }, tenantId),
          taskType: dto.taskType,
        };

      case AiTaskType.FAILURE_PREDICTION:
        if (!dto.assetId) {
          throw new HttpException('assetId required', HttpStatus.BAD_REQUEST);
        }
        return {
          result: await this.predictFailure({ assetId: dto.assetId }, tenantId),
          taskType: dto.taskType,
        };

      case AiTaskType.MAINTENANCE_RECOMMENDATION:
        if (!dto.assetId) {
          throw new HttpException('assetId required', HttpStatus.BAD_REQUEST);
        }
        return {
          result: await this.getMaintenanceRecommendation({ assetId: dto.assetId, symptoms: dto.query }, tenantId),
          taskType: dto.taskType,
        };

      case AiTaskType.TROUBLESHOOT:
        if (!dto.query) {
          throw new HttpException('query required', HttpStatus.BAD_REQUEST);
        }
        return {
          result: await this.troubleshoot({ assetId: dto.assetId, problemDescription: dto.query }, tenantId),
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

  async chat(dto: AiChatDto, tenantId: string): Promise<{ response: string; conversationId: string }> {
    const conversationId = dto.conversationId || `conv_${tenantId}_${Date.now()}`;
    const cacheKey = `${tenantId}:${conversationId}`;
    let context = this.conversationCache.get(cacheKey);

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
      const assistantMessage = await this.provider.chat(
        context.messages,
        { temperature: dto.temperature ?? 0.7 },
      );

      context.messages.push({ role: 'assistant', content: assistantMessage });
      context.lastUsed = new Date();
      this.conversationCache.set(cacheKey, context);

      return { response: assistantMessage, conversationId };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('AI service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async summarizeWorkOrder(dto: AiSummarizeWoDto, tenantId: string): Promise<string> {
    const wo = await this.workOrderRepo.findOne({
      where: { id: dto.workOrderId, tenantId },
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

    return this.callAi(prompt, 'You are a maintenance management assistant.', 0.3);
  }

  async predictFailure(dto: AiFailurePredictionDto, tenantId: string): Promise<string> {
    const asset = await this.assetRepo.findOne({
      where: { id: dto.assetId, tenantId },
      relations: ['category'],
    });

    if (!asset) {
      throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);
    }

    const recentWOs = await this.workOrderRepo.find({
      where: { assetId: dto.assetId, tenantId },
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

    return this.callAi(prompt, 'You are a predictive maintenance analyst.', 0.5);
  }

  async getMaintenanceRecommendation(dto: AiMaintenanceRecommendationDto, tenantId: string): Promise<string> {
    const asset = await this.assetRepo.findOne({
      where: { id: dto.assetId, tenantId },
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

    return this.callAi(prompt, 'You are a maintenance expert.', 0.4);
  }

  async troubleshoot(dto: AiTroubleshootDto, tenantId: string): Promise<string> {
    let assetContext = '';

    if (dto.assetId) {
      const asset = await this.assetRepo.findOne({
        where: { id: dto.assetId, tenantId },
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

    return this.callAi(prompt, 'You are a maintenance troubleshooting assistant.', 0.4);
  }

  async processNaturalLanguageQuery(query: string): Promise<string> {
    return this.callAi(
      query,
      'You are a CMMS assistant. Answer maintenance-related questions concisely.',
      0.6,
    );
  }

  async checkHealth(): Promise<{ status: string; provider: string; model: string }> {
    return this.provider.checkHealth();
  }

  clearConversation(conversationId: string): boolean {
    return this.conversationCache.delete(conversationId);
  }
}
