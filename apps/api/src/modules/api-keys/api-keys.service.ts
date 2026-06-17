import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

/**
 * Scopes an API key may carry. Deliberately excludes users:* and settings:*
 * so a leaked integration key can't manage people, roles, or org settings.
 */
export const ALLOWED_API_KEY_SCOPES = [
  'work_orders:read',
  'work_orders:write',
  'work_requests:write',
  'assets:read',
  'assets:write',
  'pm:read',
  'pm:write',
  'inventory:read',
  'inventory:write',
  'reports:read',
  'ai:read',
];

export interface CreatedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: Date;
  /** Full token — returned exactly once, never stored. */
  token: string;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(dto: CreateApiKeyDto, userId: string, tenantId: string): Promise<CreatedApiKey> {
    const invalid = dto.permissions.filter((p) => !ALLOWED_API_KEY_SCOPES.includes(p));
    if (invalid.length > 0) {
      throw new BadRequestException(`Scopes not allowed for API keys: ${invalid.join(', ')}`);
    }

    const token = `mk_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(token).digest('hex');

    const saved = await this.apiKeyRepository.save(
      this.apiKeyRepository.create({
        name: dto.name,
        keyPrefix: `${token.slice(0, 10)}…`,
        keyHash,
        permissions: [...new Set(dto.permissions)],
        createdBy: userId,
        tenantId,
      }),
    );

    return {
      id: saved.id,
      name: saved.name,
      keyPrefix: saved.keyPrefix,
      permissions: saved.permissions,
      createdAt: saved.createdAt,
      token,
    };
  }

  async findAll(tenantId: string): Promise<Omit<ApiKey, 'keyHash' | 'tenant'>[]> {
    const keys = await this.apiKeyRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return keys.map(({ keyHash: _hash, tenant: _tenant, ...rest }) => rest);
  }

  async revoke(id: string, tenantId: string): Promise<void> {
    const key = await this.apiKeyRepository.findOne({
      where: { id, tenantId, revokedAt: IsNull() },
    });
    if (!key) {
      throw new NotFoundException(`API key ${id} not found or already revoked`);
    }
    key.revokedAt = new Date();
    await this.apiKeyRepository.save(key);
  }
}
