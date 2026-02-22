import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Notification, NotificationType, UserPushToken } from './entities';

@Injectable()
export class NotificationsService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserPushToken)
    private readonly pushTokenRepository: Repository<UserPushToken>,
    private readonly configService: ConfigService,
  ) {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'mailpit',
      port: parseInt(this.configService.get<string>('SMTP_PORT') || '1025', 10),
      secure: false,
      ignoreTLS: true,
    });
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
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      message,
      data,
    });

    return this.notificationRepository.save(notification);
  }

  async findUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(notificationId, {
      isRead: true,
      readAt: new Date(),
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
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
      // Fallback to simple text
      html = `<p>${context.message || ''}</p>`;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || 'noreply@cmms.local',
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  // ==================== PUSH TOKENS ====================

  async registerPushToken(
    userId: string,
    token: string,
    platform: string,
  ): Promise<UserPushToken> {
    // Remove existing token if it exists for this user/platform
    await this.pushTokenRepository.delete({ userId, platform });

    const pushToken = this.pushTokenRepository.create({
      userId,
      token,
      platform,
    });

    return this.pushTokenRepository.save(pushToken);
  }

  async getUserPushTokens(userId: string): Promise<UserPushToken[]> {
    return this.pushTokenRepository.find({ where: { userId } });
  }

  // ==================== EVENT TRIGGERS ====================

  async onWoAssigned(workOrder: { id: string; title: string; woNumber: string }, assignedUserIds: string[]): Promise<void> {
    for (const userId of assignedUserIds) {
      await this.createNotification(
        userId,
        NotificationType.WO_ASSIGNED,
        'Work Order Assigned',
        `You have been assigned to ${workOrder.woNumber}: ${workOrder.title}`,
        { workOrderId: workOrder.id },
      );
    }
  }

  async onWoStatusChanged(
    workOrder: { id: string; woNumber: string; status: string; assignedTo: string[] },
    oldStatus: string,
  ): Promise<void> {
    for (const userId of workOrder.assignedTo || []) {
      await this.createNotification(
        userId,
        NotificationType.WO_STATUS_CHANGED,
        'Work Order Status Changed',
        `${workOrder.woNumber} status changed from ${oldStatus} to ${workOrder.status}`,
        { workOrderId: workOrder.id, oldStatus, newStatus: workOrder.status },
      );
    }
  }

  async onPmDue(pmPlan: { id: string; name: string; assetId?: string }, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await this.createNotification(
        userId,
        NotificationType.PM_DUE,
        'PM Plan Due',
        `Preventive maintenance "${pmPlan.name}" is due`,
        { pmPlanId: pmPlan.id },
      );
    }
  }

  async onLowStock(part: { id: string; name: string; sku: string }, currentQty: number): Promise<void> {
    // This would notify inventory managers - for now just log
    console.log(`Low stock alert: ${part.name} (${part.sku}) - Qty: ${currentQty}`);
  }

  async onWorkRequestSubmitted(request: { id: string; title: string; submittedBy?: string }): Promise<void> {
    // This would notify managers/planners - for now just log
    console.log(`Work request submitted: ${request.title} by ${request.submittedBy}`);
  }
}
