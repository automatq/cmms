import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @Permissions('settings:read')
  @ApiOperation({ summary: 'List webhook subscriptions' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.webhooksService.findAll(user.tenantId);
  }

  @Get(':id')
  @Permissions('settings:read')
  @ApiOperation({ summary: 'Get webhook subscription' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.webhooksService.findOne(id, user.tenantId);
  }

  @Post()
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Create webhook subscription' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  create(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.webhooksService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Update webhook subscription' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.webhooksService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Delete webhook subscription' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.webhooksService.delete(id, user.tenantId);
  }

  @Get(':id/logs')
  @Permissions('settings:read')
  @ApiOperation({ summary: 'Get webhook delivery logs' })
  getLogs(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.webhooksService.getLogs(id, user.tenantId);
  }

  @Post(':id/test')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Send test webhook' })
  test(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.webhooksService.sendTestWebhook(id, user.tenantId);
  }

  @Post('logs/:logId/redeliver')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Redeliver a webhook' })
  redeliver(
    @Param('logId', ParseUUIDPipe) logId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.webhooksService.redeliverLog(logId, user.tenantId);
  }
}
