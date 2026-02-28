import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { Asset } from '../assets/entities/asset.entity';
import { PmHistory } from '../pm/entities/pm-history.entity';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { OllamaProvider } from './providers/ollama.provider';
import { BedrockProvider } from './providers/bedrock.provider';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([WorkOrder, Asset, PmHistory]),
  ],
  controllers: [AiController],
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('AI_PROVIDER', 'ollama');
        if (provider === 'bedrock') {
          return new BedrockProvider(configService);
        }
        return new OllamaProvider(configService);
      },
      inject: [ConfigService],
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
