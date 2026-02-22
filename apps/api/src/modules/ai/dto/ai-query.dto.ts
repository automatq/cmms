import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, Min, Max, MaxLength } from 'class-validator';

export enum AiTaskType {
  SUMMARIZE_WO = 'summarize_wo',
  FAILURE_PREDICTION = 'failure_prediction',
  MAINTENANCE_RECOMMENDATION = 'maintenance_recommendation',
  NATURAL_LANGUAGE_QUERY = 'natural_language_query',
  TROUBLESHOOT = 'troubleshoot',
}

export class AiQueryDto {
  @IsEnum(AiTaskType)
  taskType: AiTaskType;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  query?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  context?: string;
}

export class AiChatDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}

export class AiSummarizeWoDto {
  @IsUUID()
  workOrderId: string;

  @IsOptional()
  @IsString()
  additionalContext?: string;
}

export class AiFailurePredictionDto {
  @IsUUID()
  assetId: string;

  @IsOptional()
  @IsNumber()
  daysAhead?: number;
}

export class AiMaintenanceRecommendationDto {
  @IsUUID()
  assetId: string;

  @IsOptional()
  @IsString()
  symptoms?: string;
}

export class AiTroubleshootDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsString()
  @MaxLength(2000)
  problemDescription: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  errorCodes?: string;
}
