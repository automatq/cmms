import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { Asset } from '../assets/entities/asset.entity';
import { AssetMeter } from '../assets/entities/asset-meter.entity';
import { AssetDowntime } from '../assets/entities/asset-downtime.entity';
import { AssetConditionLog } from '../assets/entities/asset-condition-log.entity';
import { PmHistory } from '../pm/entities/pm-history.entity';
import { PmPlan } from '../pm/entities/pm-plan.entity';
import { Part } from '../inventory/entities/part.entity';
import { InventoryStock } from '../inventory/entities/inventory-stock.entity';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { OllamaProvider } from './providers/ollama.provider';
import { BedrockProvider } from './providers/bedrock.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      WorkOrder,
      Asset,
      AssetMeter,
      AssetDowntime,
      AssetConditionLog,
      PmHistory,
      PmPlan,
      Part,
      InventoryStock,
    ]),
  ],
  controllers: [AiController],
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: (configService: ConfigService) => {
        // Precedence: an explicit AI_PROVIDER always wins; otherwise prefer
        // Anthropic (hosted Claude) when ANTHROPIC_API_KEY is present so a
        // cloud deploy works with a single env var, falling back to Ollama for
        // local/self-hosted. The old hard default of 'ollama' pointed at
        // http://ollama:11434, which is unreachable on most hosts (→ 503s).
        const explicit = configService.get<string>('AI_PROVIDER');
        const anthropicKey = configService.get<string>('ANTHROPIC_API_KEY');
        const provider = explicit || (anthropicKey ? 'anthropic' : 'ollama');

        // An unrecognized explicit value would silently fall through to Ollama
        // (likely unreachable). Surface the misconfiguration loudly.
        if (explicit && !['anthropic', 'bedrock', 'ollama'].includes(explicit)) {
          new Logger('AiModule').warn(
            `Unknown AI_PROVIDER "${explicit}" — falling back to Ollama. Valid values: anthropic, bedrock, ollama.`,
          );
        }

        switch (provider) {
          case 'anthropic':
            return new AnthropicProvider(configService);
          case 'bedrock':
            return new BedrockProvider(configService);
          default:
            return new OllamaProvider(configService);
        }
      },
      inject: [ConfigService],
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
