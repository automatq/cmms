import {
  Controller,
  Get,
  Post,
  Patch,
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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  findAll(@CurrentUser() user: { sub: string }) {
    return this.notificationsService.findUserNotifications(user.sub);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@CurrentUser() user: { sub: string }) {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllRead(@CurrentUser() user: { sub: string }) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Register push notification token' })
  @ApiResponse({ status: 201, description: 'Push token registered' })
  registerPushToken(
    @CurrentUser() user: { sub: string },
    @Body() body: { token: string; platform: string },
  ) {
    return this.notificationsService.registerPushToken(
      user.sub,
      body.token,
      body.platform,
    );
  }
}
