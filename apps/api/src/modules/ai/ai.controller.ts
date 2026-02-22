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
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  checkHealth() {
    return this.aiService.checkHealth();
  }

  @Get('models')
  @Permissions('ai:read')
  listModels() {
    return this.aiService.listModels();
  }

  @Post('query')
  @Permissions('ai:read')
  processQuery(@Body() dto: AiQueryDto) {
    return this.aiService.processQuery(dto);
  }

  @Post('chat')
  @Permissions('ai:read')
  chat(@Body() dto: AiChatDto) {
    return this.aiService.chat(dto);
  }

  @Delete('chat/:conversationId')
  @Permissions('ai:read')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearConversation(@Param('conversationId') conversationId: string) {
    this.aiService.clearConversation(conversationId);
  }

  @Post('summarize-wo')
  @Permissions('ai:read')
  summarizeWorkOrder(@Body() dto: AiSummarizeWoDto) {
    return this.aiService.summarizeWorkOrder(dto);
  }

  @Post('predict-failure')
  @Permissions('ai:read')
  predictFailure(@Body() dto: AiFailurePredictionDto) {
    return this.aiService.predictFailure(dto);
  }

  @Post('maintenance-recommendation')
  @Permissions('ai:read')
  getMaintenanceRecommendation(@Body() dto: AiMaintenanceRecommendationDto) {
    return this.aiService.getMaintenanceRecommendation(dto);
  }

  @Post('troubleshoot')
  @Permissions('ai:read')
  troubleshoot(@Body() dto: AiTroubleshootDto) {
    return this.aiService.troubleshoot(dto);
  }
}
