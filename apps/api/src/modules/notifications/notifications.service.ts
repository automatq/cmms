import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Notification, NotificationType, UserPushToken } from './entities';
import { User } from '../users/entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly emailProvider: string;
  private readonly appUrl: string;
  private transporter: nodemailer.Transporter | null = null;
  private sesClient: SESClient | null = null;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserPushToken)
    private readonly pushTokenRepository: Repository<UserPushToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {
    this.appUrl = this.configService.get<string>('PUBLIC_URL', 'http://localhost');
    this.emailProvider = this.configService.get<string>('EMAIL_PROVIDER', 'smtp');
    this.initializeEmailClient();
    this.loadTemplates();
  }

  private initializeEmailClient(): void {
    if (this.emailProvider === 'ses') {
      this.sesClient = new SESClient({
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST') || 'mailpit',
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '1025', 10),
        secure: false,
        ignoreTLS: true,
      });
    }
  }

  private loadTemplates(): void {
    const templatesDir = path.join(__dirname, 'templates');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    const templateFiles = [
      'wo-assigned',
      'wo-completed',
      'pm-due',
      'low-stock',
      'work-request',
    ];

    for (const name of templateFiles) {
      const filePath = path.join(templatesDir, `${name}.hbs`);
      if (fs.existsSync(filePath)) {
        const template = fs.readFileSync(filePath, 'utf-8');
        this.templates.set(name, Handlebars.compile(template));
      }
    }
  }

  // ==================== IN-APP NOTIFICATIONS ====================

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
    tenantId: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      message,
      data,
      tenantId,
    });

    const saved = await this.notificationRepository.save(notification);

    // Emit real-time notification via WebSocket
    try {
      this.realtimeGateway.emitToUser(userId, 'notification:new', {
        id: saved.id,
        type: saved.type,
        title: saved.title,
        message: saved.message,
        data: saved.data,
        createdAt: saved.createdAt,
      });
    } catch (error) {
      this.logger.warn(`Failed to emit WebSocket notification: ${error instanceof Error ? error.message : error}`);
    }

    return saved;
  }

  async broadcastToTenant(
    type: NotificationType | string,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
    tenantId: string,
  ): Promise<void> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .where('user.status = :status', { status: 'active' })
      .select(['user.id'])
      .getMany();

    for (const user of users) {
      try {
        await this.createNotification(user.id, type as NotificationType, title, message, data, tenantId);
      } catch (error) {
        this.logger.warn(`Failed to notify user ${user.id}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  async findUserNotifications(userId: string, tenantId: string, limit = 50): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId, tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, tenantId, isRead: false },
    });
  }

  async markRead(notificationId: string, tenantId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, tenantId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllRead(userId: string, tenantId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, tenantId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  // ==================== EMAIL ====================

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    let html: string;

    const template = this.templates.get(templateName);
    if (template) {
      html = template(context);
    } else {
      html = `<p>${context.message || ''}</p>`;
    }

    const from = this.configService.get('EMAIL_FROM') ||
      this.configService.get('SMTP_FROM') || 'noreply@nexly.local';

    try {
      if (this.emailProvider === 'ses' && this.sesClient) {
        await this.sesClient.send(new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Html: { Data: html, Charset: 'UTF-8' } },
          },
        }));
      } else if (this.transporter) {
        await this.transporter.sendMail({ from, to, subject, html });
      }
    } catch (error) {
      this.logger.error('Failed to send email:', error);
    }
  }

  // ==================== PUSH TOKENS ====================

  async registerPushToken(
    userId: string,
    token: string,
    platform: string,
    tenantId: string,
  ): Promise<UserPushToken> {
    // Remove existing token if it exists for this user/platform
    await this.pushTokenRepository.delete({ userId, platform, tenantId });

    const pushToken = this.pushTokenRepository.create({
      userId,
      token,
      platform,
      tenantId,
    });

    return this.pushTokenRepository.save(pushToken);
  }

  async getUserPushTokens(userId: string, tenantId: string): Promise<UserPushToken[]> {
    return this.pushTokenRepository.find({ where: { userId, tenantId } });
  }

  // ==================== EVENT TRIGGERS ====================

  async onWoStatusChanged(
    workOrder: { id: string; woNumber: string; title?: string; status: string; createdById: string },
    oldStatus: string,
    tenantId: string,
  ): Promise<void> {
    const userIds = workOrder.createdById ? [workOrder.createdById] : [];
    const users = userIds.length > 0
      ? await this.userRepository
          .createQueryBuilder('user')
          .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
          .where('user.id IN (:...userIds)', { userIds })
          .getMany()
      : [];

    for (const user of users) {
      await this.createNotification(
        user.id,
        NotificationType.WO_STATUS_CHANGED,
        'Work Order Status Changed',
        `${workOrder.woNumber} status changed from ${oldStatus} to ${workOrder.status}`,
        { workOrderId: workOrder.id, oldStatus, newStatus: workOrder.status },
        tenantId,
      );

      if (user.email && user.notificationPreferences?.email_wo_status_changed !== false) {
        await this.sendEmail(user.email, `WO ${workOrder.status}: ${workOrder.woNumber}`, 'wo-completed', {
          woNumber: workOrder.woNumber,
          title: workOrder.title,
          oldStatus,
          newStatus: workOrder.status,
          woId: workOrder.id,
          appUrl: this.appUrl,
        });
      }
    }
  }

  async onPmDue(pmPlan: { id: string; name: string; assetId?: string }, userIds: string[], tenantId: string): Promise<void> {
    const users = userIds?.length > 0
      ? await this.userRepository
          .createQueryBuilder('user')
          .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
          .where('user.id IN (:...userIds)', { userIds })
          .getMany()
      : [];

    for (const user of users) {
      await this.createNotification(
        user.id,
        NotificationType.PM_DUE,
        'PM Plan Due',
        `Preventive maintenance "${pmPlan.name}" is due`,
        { pmPlanId: pmPlan.id },
        tenantId,
      );

      if (user.email && user.notificationPreferences?.email_pm_due !== false) {
        await this.sendEmail(user.email, `PM Due: ${pmPlan.name}`, 'pm-due', {
          planName: pmPlan.name,
          appUrl: this.appUrl,
        });
      }
    }
  }

  async onLowStock(part: { id: string; name: string; sku: string }, currentQty: number, tenantId: string): Promise<void> {
    // Find users with inventory permissions to notify
    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .getMany();

    for (const user of users) {
      await this.createNotification(
        user.id,
        NotificationType.LOW_STOCK,
        'Low Stock Alert',
        `${part.name} (${part.sku}) is low: ${currentQty} remaining`,
        { partId: part.id },
        tenantId,
      );

      if (user.email && user.notificationPreferences?.email_low_stock !== false) {
        await this.sendEmail(user.email, `Low Stock: ${part.name}`, 'low-stock', {
          partName: part.name,
          sku: part.sku,
          currentQty,
          appUrl: this.appUrl,
        });
      }
    }
  }

  async onWorkRequestSubmitted(request: { id: string; title: string; submittedBy?: string; description?: string }, tenantId: string): Promise<void> {
    // Notify all active users (managers will be filtered by permissions in future)
    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .getMany();

    for (const user of users) {
      await this.createNotification(
        user.id,
        NotificationType.WORK_REQUEST,
        'New Work Request',
        `Work request submitted: ${request.title}`,
        { workRequestId: request.id },
        tenantId,
      );

      if (user.email && user.notificationPreferences?.email_work_request !== false) {
        await this.sendEmail(user.email, `New Work Request: ${request.title}`, 'work-request', {
          title: request.title,
          submittedBy: request.submittedBy,
          description: request.description,
          appUrl: this.appUrl,
        });
      }
    }
  }
}
