import { Injectable, Logger, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { Asset } from '../assets/entities/asset.entity';
import { AssetMeter } from '../assets/entities/asset-meter.entity';
import { AssetDowntime } from '../assets/entities/asset-downtime.entity';
import { AssetConditionLog } from '../assets/entities/asset-condition-log.entity';
import {
  AiTaskType,
  AiQueryDto,
  AiChatDto,
  AiSummarizeWoDto,
  AiFailurePredictionDto,
  AiMaintenanceRecommendationDto,
  AiTroubleshootDto,
  AiGenerateChecklistDto,
} from './dto';
import { AiProvider, AI_PROVIDER, ChatMessage } from './providers/ai-provider.interface';

export interface GeneratedChecklistItem {
  step: number;
  instruction: string;
  requiresPhoto?: boolean;
  requiresValue?: boolean;
  unit?: string;
  passFail?: boolean;
  safetyNotes?: string;
  requiredPPE?: string[];
}

export interface GeneratedChecklist {
  name: string;
  description: string;
  category: string;
  items: GeneratedChecklistItem[];
}

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
    @InjectRepository(AssetMeter)
    private meterRepo: Repository<AssetMeter>,
    @InjectRepository(AssetDowntime)
    private downtimeRepo: Repository<AssetDowntime>,
    @InjectRepository(AssetConditionLog)
    private conditionLogRepo: Repository<AssetConditionLog>,
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
          content: 'You are a MainTek AI assistant helping with maintenance management.',
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

    // Gather comprehensive data for prediction
    const [recentWOs, meterReadings, downtimeHistory, conditionHistory] = await Promise.all([
      this.workOrderRepo.find({
        where: { assetId: dto.assetId, tenantId },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.meterRepo.find({
        where: { assetId: dto.assetId },
        order: { recordedAt: 'DESC' },
        take: 20,
      }),
      this.downtimeRepo.find({
        where: { assetId: dto.assetId, tenantId },
        order: { startedAt: 'DESC' },
        take: 10,
      }),
      this.conditionLogRepo.find({
        where: { assetId: dto.assetId, tenantId },
        order: { assessedAt: 'DESC' },
        take: 10,
      }),
    ]);

    // Build meter trend context
    const meterContext = meterReadings.length > 0
      ? `\nMeter Readings (${asset.meterType || 'unknown'}, most recent first):\n${meterReadings.map(m => `  ${new Date(m.recordedAt).toISOString().split('T')[0]}: ${m.reading}`).join('\n')}`
      : '\nNo meter readings available.';

    // Build downtime context
    const downtimeContext = downtimeHistory.length > 0
      ? `\nDowntime Events (last ${downtimeHistory.length}):\n${downtimeHistory.map(d => `  ${new Date(d.startedAt).toISOString().split('T')[0]}: ${d.reason || 'No reason'} (${d.durationMinutes ? d.durationMinutes + ' min' : 'ongoing'})`).join('\n')}`
      : '\nNo downtime events recorded.';

    // Build condition trend context
    const conditionContext = conditionHistory.length > 0
      ? `\nCondition Assessments (1=poor, 5=excellent):\n${conditionHistory.map(c => `  ${new Date(c.assessedAt).toISOString().split('T')[0]}: ${c.condition}/5${c.notes ? ' - ' + c.notes : ''}`).join('\n')}`
      : '';

    // Asset age and warranty
    const ageYears = asset.purchaseDate
      ? ((Date.now() - new Date(asset.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)
      : 'unknown';
    const warrantyStatus = asset.warrantyExpiry
      ? (new Date(asset.warrantyExpiry) > new Date() ? 'under warranty' : 'warranty expired')
      : 'no warranty info';

    const correctiveCount = recentWOs.filter(wo => wo.type === 'corrective').length;
    const preventiveCount = recentWOs.filter(wo => wo.type === 'preventive').length;

    const prompt = `Analyze this asset's comprehensive maintenance data and predict remaining useful life and likely failures:

Asset: ${asset.name} (${asset.assetNumber})
Category: ${asset.category?.name || 'Unknown'}
Manufacturer: ${asset.manufacturer || 'Unknown'} | Model: ${asset.model || 'Unknown'}
Status: ${asset.status} | Condition: ${asset.assetCondition || 'N/A'}/5
Age: ${ageYears} years | Expected Life: ${asset.expectedLifeYears || 'N/A'} years | ${warrantyStatus}
Current Meter: ${asset.currentMeterValue} ${asset.meterType || ''}
${meterContext}
${downtimeContext}
${conditionContext}

Work Order History (last ${recentWOs.length}):
  Corrective: ${correctiveCount} | Preventive: ${preventiveCount}
${recentWOs.slice(0, 10).map(wo => `  - [${wo.type}] ${wo.title} (${wo.failureCode || 'no code'}) ${new Date(wo.createdAt).toISOString().split('T')[0]}`).join('\n')}

Based on this data:
1. Estimate remaining useful life (RUL) with confidence level
2. Identify the top 3 most likely failure modes and their probability
3. Recommend specific preventive actions with timing
4. Flag any concerning trends in meter readings or condition degradation
5. Suggest optimal PM interval adjustments if applicable`;

    return this.callAi(prompt, 'You are an expert predictive maintenance analyst specializing in reliability-centered maintenance (RCM) and ISO 55000 asset management. Provide data-driven analysis with specific, actionable recommendations.', 0.4);
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

  /**
   * Generate a draft PM checklist from a manual excerpt or freeform description.
   * Returns the parsed draft WITHOUT persisting — the UI lets the user review
   * and save it through the existing checklist-template create path.
   */
  async generateChecklist(
    dto: AiGenerateChecklistDto,
    tenantId: string,
  ): Promise<GeneratedChecklist> {
    let assetContext = '';
    if (dto.assetId) {
      const asset = await this.assetRepo.findOne({
        where: { id: dto.assetId, tenantId },
        relations: ['category'],
      });
      if (asset) {
        assetContext = `Target asset: ${asset.name} (${asset.assetNumber}), category ${asset.category?.name || 'Unknown'}, manufacturer ${asset.manufacturer || 'n/a'}, model ${asset.model || 'n/a'}.\n`;
      }
    }

    const system =
      'You are a maintenance reliability engineer who writes precise preventive-maintenance checklists. ' +
      'Respond with ONLY valid JSON (no markdown, no commentary).';

    const prompt = `Create a maintenance checklist based on the following.
${dto.category ? `Category: ${dto.category}\n` : ''}${assetContext}Source / description:
${dto.description}

Return JSON exactly of this shape:
{"name": string, "description": string, "category": string, "items": [{"step": number, "instruction": string, "requiresPhoto"?: boolean, "requiresValue"?: boolean, "unit"?: string, "passFail"?: boolean, "safetyNotes"?: string, "requiredPPE"?: string[]}]}
Rules: 5-20 concise, actionable steps numbered sequentially from 1; set requiresValue + unit for measurements; set passFail for inspection checks; include safetyNotes/requiredPPE where relevant.`;

    let raw: string;
    try {
      raw = await this.provider.chat(
        [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3, maxTokens: 2000 },
      );
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`AI provider error: ${error?.message || 'Unknown'}`);
      throw new HttpException('AI service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }

    return this.parseGeneratedChecklist(raw, dto.category);
  }

  /** Tolerant JSON extraction + normalization of an AI-generated checklist. */
  private parseGeneratedChecklist(raw: string, fallbackCategory?: string): GeneratedChecklist {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new HttpException('AI returned an unparseable checklist', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      throw new HttpException('AI returned malformed checklist JSON', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const rawItems: any[] = Array.isArray(parsed.items) ? parsed.items : [];
    const items: GeneratedChecklistItem[] = rawItems
      .filter((it) => it && typeof it.instruction === 'string' && it.instruction.trim())
      .map((it, idx) => ({
        step: typeof it.step === 'number' ? it.step : idx + 1,
        instruction: String(it.instruction).trim(),
        ...(it.requiresPhoto != null ? { requiresPhoto: !!it.requiresPhoto } : {}),
        ...(it.requiresValue != null ? { requiresValue: !!it.requiresValue } : {}),
        ...(typeof it.unit === 'string' ? { unit: it.unit } : {}),
        ...(it.passFail != null ? { passFail: !!it.passFail } : {}),
        ...(typeof it.safetyNotes === 'string' ? { safetyNotes: it.safetyNotes } : {}),
        ...(Array.isArray(it.requiredPPE)
          ? { requiredPPE: it.requiredPPE.filter((p: unknown) => typeof p === 'string') }
          : {}),
      }))
      // Re-number to guarantee a clean sequential order.
      .map((it, idx) => ({ ...it, step: idx + 1 }));

    if (items.length === 0) {
      throw new HttpException('AI returned an empty checklist', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Generated checklist',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      category: typeof parsed.category === 'string' && parsed.category ? parsed.category : fallbackCategory || '',
      items,
    };
  }

  async processNaturalLanguageQuery(query: string): Promise<string> {
    return this.callAi(
      query,
      'You are a MainTek assistant. Answer maintenance-related questions concisely.',
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
