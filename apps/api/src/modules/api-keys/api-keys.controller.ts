import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService, ALLOWED_API_KEY_SCOPES } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @Permissions('settings:read')
  @ApiOperation({ summary: 'List API keys (hashes never returned)' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.apiKeysService.findAll(user.tenantId);
  }

  @Get('scopes')
  @Permissions('settings:read')
  @ApiOperation({ summary: 'List permission scopes an API key may be granted' })
  scopes() {
    return ALLOWED_API_KEY_SCOPES;
  }

  @Post()
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Create an API key — the token is returned once' })
  create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: RequestUser) {
    return this.apiKeysService.create(dto, user.userId, user.tenantId);
  }

  @Delete(':id')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Revoke an API key' })
  revoke(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.apiKeysService.revoke(id, user.tenantId);
  }
}
