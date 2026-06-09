import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import {
  AiQueryDto,
  AiChatDto,
  AiSummarizeWoDto,
  AiFailurePredictionDto,
  AiMaintenanceRecommendationDto,
  AiTroubleshootDto,
  AiGenerateChecklistDto,
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';

@RequireFeature('aiAssistant')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  checkHealth() {
    return this.aiService.checkHealth();
  }

  @Post('query')
  @Permissions('ai:read')
  processQuery(@Body() dto: AiQueryDto, @CurrentUser() user: RequestUser) {
    return this.aiService.processQuery(dto, user.tenantId);
  }

  @Post('chat')
  @Permissions('ai:read')
  chat(@Body() dto: AiChatDto, @CurrentUser() user: RequestUser) {
    return this.aiService.chat(dto, user.tenantId);
  }

  @Delete('chat/:conversationId')
  @Permissions('ai:read')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearConversation(@Param('conversationId') conversationId: string) {
    this.aiService.clearConversation(conversationId);
  }

  @Post('summarize-wo')
  @Permissions('ai:read')
  summarizeWorkOrder(@Body() dto: AiSummarizeWoDto, @CurrentUser() user: RequestUser) {
    return this.aiService.summarizeWorkOrder(dto, user.tenantId);
  }

  @Post('predict-failure')
  @Permissions('ai:read')
  predictFailure(@Body() dto: AiFailurePredictionDto, @CurrentUser() user: RequestUser) {
    return this.aiService.predictFailure(dto, user.tenantId);
  }

  @Post('maintenance-recommendation')
  @Permissions('ai:read')
  getMaintenanceRecommendation(@Body() dto: AiMaintenanceRecommendationDto, @CurrentUser() user: RequestUser) {
    return this.aiService.getMaintenanceRecommendation(dto, user.tenantId);
  }

  @Post('troubleshoot')
  @Permissions('ai:read')
  troubleshoot(@Body() dto: AiTroubleshootDto, @CurrentUser() user: RequestUser) {
    return this.aiService.troubleshoot(dto, user.tenantId);
  }

  @Post('generate-checklist')
  @Permissions('ai:read')
  generateChecklist(@Body() dto: AiGenerateChecklistDto, @CurrentUser() user: RequestUser) {
    return this.aiService.generateChecklist(dto, user.tenantId);
  }
}
