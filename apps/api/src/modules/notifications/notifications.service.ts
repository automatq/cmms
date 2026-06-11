import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Resend } from 'resend';
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
  private readonly appUrl: string;
  private readonly emailFrom: string;
  private resolvedProvider: 'resend' | 'ses' | 'smtp' | 'none' = 'none';
  private transporter: nodemailer.Transporter | null = null;
  private sesClient: SESClient | null = null;
  private resendClient: Resend | null = null;
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
    this.emailFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      this.configService.get<string>('SMTP_FROM') ||
      'MainTek <noreply@maintek.app>';
    this.initializeEmailClient();
    this.loadTemplates();
  }

  /**
   * Resolve the email transport with a sensible precedence so transactional
   * notifications actually deliver in production:
   *   - EMAIL_PROVIDER, if explicitly set, always wins (resend | ses | smtp).
   *   - Otherwise prefer Resend when RESEND_API_KEY is present (the same
   *     transport auth + scheduled-report emails already use), falling back
   *     to SMTP for local/dev (mailpit).
   * The previous default hard-coded 'smtp' → mailpit, which silently dropped
   * every notification email in production where mailpit doesn't exist.
   */
  private initializeEmailClient(): void {
    const explicit = this.configService.get<string>('EMAIL_PROVIDER');
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    const provider = explicit || (resendKey ? 'resend' : 'smtp');

    if (provider === 'resend') {
      if (!resendKey) {
        this.logger.warn(
          'EMAIL_PROVIDER=resend but RESEND_API_KEY is not set — notification emails are disabled.',
        );
        this.resolvedProvider = 'none';
        return;
      }
      this.resendClient = new Resend(resendKey);
      this.resolvedProvider = 'resend';
    } else if (provider === 'ses') {
      this.sesClient = new SESClient({
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      });
      this.resolvedProvider = 'ses';
    } else {
      // SMTP. Real production sets RESEND_API_KEY (→ resend above), so this
      // branch is for local/dev (mailpit) or a self-hosted real SMTP server.
      const host = this.configService.get<string>('SMTP_HOST') || 'mailpit';
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '1025', 10),
        secure: false,
        ignoreTLS: true,
      });
      this.resolvedProvider = 'smtp';

      // mailpit/localhost is a local sink that captures but never delivers
      // externally. Flag it (independent of NODE_ENV, which dev compose sets to
      // 'production') so a misconfigured deploy isn't a silent black hole.
      if (host === 'mailpit' || host === 'localhost') {
        this.logger.warn(
          `Notification email transport: SMTP -> "${host}" (local sink, no external delivery). ` +
            'Set RESEND_API_KEY or a real SMTP_HOST for production email.',
        );
        return;
      }
    }

    this.logger.log(`Notification email transport: ${this.resolvedProvider}`);
  }

  private loadTemplates(): void {
    const templatesDir = path.join(__dirname, 'templates');
    if (!fs.existsSync(templatesDir)) {
      // Templates are normally copied into dist by nest-cli assets. If the dir
      // is missing and unwritable (e.g. read-only fs), degrade to plain-text
      // emails rather than crashing the whole service at construction.
      try {
        fs.mkdirSync(templatesDir, { recursive: true });
      } catch (err) {
        this.logger.warn(
          `Could not create templates dir ${templatesDir}: ${err instanceof Error ? err.message : err}`,
        );
        return;
      }
    }

    const templateFiles = [
      'wo-assigned',
      'wo-completed',
      'wo-due-soon',
      'wo-overdue',
      'pm-due',
      'low-stock',
      'work-request',
      'mention',
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

  /**
   * Send a templated email. Returns whether the message was actually handed
   * off to a transport — callers may ignore it, but the boolean (plus logging)
   * makes delivery failures observable instead of silently swallowed.
   */
  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<boolean> {
    if (!to) return false;

    const template = this.templates.get(templateName);
    const html = template ? template(context) : `<p>${context.message || subject}</p>`;
    const from = this.emailFrom;

    try {
      if (this.resolvedProvider === 'resend' && this.resendClient) {
        const result = await this.resendClient.emails.send({ from, to, subject, html });
        if (result.error) {
          this.logger.error(
            `Resend rejected "${subject}" -> ${to}: ${result.error.name}: ${result.error.message}`,
          );
          return false;
        }
        return true;
      }
      if (this.resolvedProvider === 'ses' && this.sesClient) {
        await this.sesClient.send(new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Html: { Data: html, Charset: 'UTF-8' } },
          },
        }));
        return true;
      }
      if (this.resolvedProvider === 'smtp' && this.transporter) {
        await this.transporter.sendMail({ from, to, subject, html });
        return true;
      }
      // No transport configured — already warned once at boot; stay quiet here.
      this.logger.debug(`Email transport disabled; skipped "${subject}" -> ${to}`);
      return false;
    } catch (error) {
      this.logger.error(
        `Failed to send email "${subject}" -> ${to}: ${error instanceof Error ? error.message : error}`,
      );
      return false;
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

  // ==================== EXTRA CHANNELS (SMS / Slack / Teams / Push) ====================

  /** Send an SMS via Twilio's REST API. No-op (returns false) if unconfigured. */
  async sendSms(toPhone: string, body: string): Promise<boolean> {
    const sid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.configService.get<string>('TWILIO_FROM');
    if (!sid || !token || !from || !toPhone) {
      this.logger.debug('SMS transport not configured; skipped');
      return false;
    }
    try {
      const params = new URLSearchParams({ To: toPhone, From: from, Body: body });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!res.ok) {
        this.logger.error(`Twilio SMS failed (${res.status}) -> ${toPhone}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`SMS send failed -> ${toPhone}: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  /** Post a message to a Slack incoming-webhook URL. */
  async sendSlack(webhookUrl: string, title: string, message: string): Promise<boolean> {
    if (!webhookUrl) return false;
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*${title}*\n${message}` }),
      });
      return res.ok;
    } catch (error) {
      this.logger.error(`Slack send failed: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  /** Post a message to a Microsoft Teams incoming-webhook URL. */
  async sendTeams(webhookUrl: string, title: string, message: string): Promise<boolean> {
    if (!webhookUrl) return false;
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text: message }),
      });
      return res.ok;
    } catch (error) {
      this.logger.error(`Teams send failed: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  /** Send an Expo push notification to a user's registered devices. */
  async sendPush(
    userId: string,
    title: string,
    body: string,
    data: Record<string, unknown>,
    tenantId: string,
  ): Promise<boolean> {
    const tokens = await this.getUserPushTokens(userId, tenantId);
    if (tokens.length === 0) return false;
    try {
      const messages = tokens.map((t) => ({ to: t.token, title, body, data, sound: 'default' }));
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      return res.ok;
    } catch (error) {
      this.logger.error(`Push send failed -> user ${userId}: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  /**
   * Fan a notification out to a user's enabled extra channels (SMS / Slack /
   * Teams / push). In-app + email are handled by the event methods; this adds
   * the opt-in channels based on the user's notificationPreferences. Each send
   * is isolated so one failing channel never blocks the others.
   */
  private async deliverExtraChannels(
    user: User,
    title: string,
    message: string,
    data: Record<string, unknown>,
    tenantId: string,
  ): Promise<void> {
    const prefs = user.notificationPreferences || {};

    if (prefs.channel_sms_enabled && (prefs as any).channel_sms_phone) {
      await this.sendSms(String((prefs as any).channel_sms_phone), `${title}: ${message}`);
    }
    if (prefs.channel_slack_enabled && (prefs as any).channel_slack_webhook) {
      await this.sendSlack(String((prefs as any).channel_slack_webhook), title, message);
    }
    if (prefs.channel_teams_enabled && (prefs as any).channel_teams_webhook) {
      await this.sendTeams(String((prefs as any).channel_teams_webhook), title, message);
    }
    if (prefs.channel_push_enabled !== false) {
      await this.sendPush(user.id, title, message, data, tenantId);
    }
  }

  // ==================== EVENT TRIGGERS ====================

  async onWoStatusChanged(
    workOrder: {
      id: string;
      woNumber: string;
      title?: string;
      status: string;
      createdById: string;
      assignedToId?: string | null;
    },
    oldStatus: string,
    tenantId: string,
  ): Promise<void> {
    // Notify both the creator and the assigned technician (deduped).
    const userIds = [...new Set([workOrder.createdById, workOrder.assignedToId].filter(Boolean))] as string[];
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

      await this.deliverExtraChannels(
        user,
        'PM plan due',
        `Preventive maintenance "${pmPlan.name}" is due`,
        { pmPlanId: pmPlan.id },
        tenantId,
      );
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

  /**
   * Active members who can action a work order — anyone whose role grants
   * `work_orders:write`, `work_orders:write:own`, or the `*` admin wildcard
   * (technicians, planners, managers, admins). Falls back to all active members
   * when no role carries a work-order permission, so a request is never lost.
   */
  private async findWorkOrderActioners(tenantId: string): Promise<User[]> {
    const perms = ['*', 'work_orders:write', 'work_orders:write:own'];

    const targeted = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .innerJoin('user_roles', 'ur', 'ur.user_id = user.id')
      .innerJoin('roles', 'r', 'r.id = ur.role_id AND r.tenant_id = :tenantId', { tenantId })
      .where('user.status = :status', { status: 'active' })
      // roles.permissions is a JSONB string[]; match any role whose array
      // contains one of `perms`. Use jsonb_array_elements_text + EXISTS (valid
      // on jsonb arrays, and avoids the `?|` operator which collides with
      // driver placeholders).
      .andWhere(
        `jsonb_typeof(r.permissions) = 'array' AND EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(r.permissions) AS perm
           WHERE perm = ANY(ARRAY[:...perms]::text[])
         )`,
        { perms },
      )
      .select(['user.id', 'user.email', 'user.notificationPreferences'])
      .distinct(true)
      .getMany();

    if (targeted.length > 0) return targeted;

    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .where('user.status = :status', { status: 'active' })
      .select(['user.id', 'user.email', 'user.notificationPreferences'])
      .getMany();
  }

  async onWorkRequestSubmitted(request: { id: string; title: string; submittedBy?: string; description?: string }, tenantId: string): Promise<void> {
    // Notify the people who can pick up the work (techs, planners, managers, admins).
    const users = await this.findWorkOrderActioners(tenantId);

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

  /** Notify a technician that a work order has been assigned to them. */
  async onWorkOrderAssigned(
    workOrder: { id: string; woNumber: string; title?: string },
    assigneeUserId: string,
    tenantId: string,
  ): Promise<void> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .where('user.id = :id', { id: assigneeUserId })
      .getOne();
    if (!user) return;

    await this.createNotification(
      user.id,
      NotificationType.WO_ASSIGNED,
      'Work order assigned to you',
      `${workOrder.woNumber}${workOrder.title ? ` — ${workOrder.title}` : ''}`,
      { workOrderId: workOrder.id },
      tenantId,
    );

    if (user.email && user.notificationPreferences?.email_wo_assigned !== false) {
      await this.sendEmail(user.email, `Assigned to you: ${workOrder.woNumber}`, 'wo-assigned', {
        woNumber: workOrder.woNumber,
        title: workOrder.title,
        woId: workOrder.id,
        appUrl: this.appUrl,
      });
    }

    await this.deliverExtraChannels(
      user,
      'Work order assigned to you',
      `${workOrder.woNumber}${workOrder.title ? ` — ${workOrder.title}` : ''}`,
      { workOrderId: workOrder.id },
      tenantId,
    );
  }

  /**
   * Resolve the assignee + creator of a work order to tenant-member User rows
   * (deduped). Shared by the SLA due-soon / overdue notifiers.
   */
  private async resolveWoStakeholders(
    workOrder: { assignedToId?: string | null; createdById?: string | null },
    tenantId: string,
  ): Promise<User[]> {
    const userIds = [
      ...new Set([workOrder.assignedToId, workOrder.createdById].filter(Boolean)),
    ] as string[];
    if (userIds.length === 0) return [];
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .where('user.id IN (:...userIds)', { userIds })
      .getMany();
  }

  /** Notify stakeholders that a work order is approaching its SLA due date. */
  async onWoDueSoon(
    workOrder: {
      id: string;
      woNumber: string;
      title?: string;
      dueDate?: Date | string | null;
      assignedToId?: string | null;
      createdById?: string | null;
    },
    tenantId: string,
  ): Promise<void> {
    const due = workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleString() : '';
    const users = await this.resolveWoStakeholders(workOrder, tenantId);

    for (const user of users) {
      await this.createNotification(
        user.id,
        NotificationType.WO_DUE_SOON,
        'Work order due soon',
        `${workOrder.woNumber}${workOrder.title ? ` — ${workOrder.title}` : ''} is due ${due}`,
        { workOrderId: workOrder.id },
        tenantId,
      );

      if (user.email && user.notificationPreferences?.email_wo_due_soon !== false) {
        await this.sendEmail(user.email, `Due soon: ${workOrder.woNumber}`, 'wo-due-soon', {
          woNumber: workOrder.woNumber,
          title: workOrder.title,
          dueDate: due,
          woId: workOrder.id,
          appUrl: this.appUrl,
        });
      }

      await this.deliverExtraChannels(
        user,
        'Work order due soon',
        `${workOrder.woNumber}${workOrder.title ? ` — ${workOrder.title}` : ''} is due ${due}`,
        { workOrderId: workOrder.id },
        tenantId,
      );
    }
  }

  /** Notify stakeholders that a work order has breached its SLA due date. */
  async onWoOverdue(
    workOrder: {
      id: string;
      woNumber: string;
      title?: string;
      dueDate?: Date | string | null;
      assignedToId?: string | null;
      createdById?: string | null;
    },
    level: number,
    tenantId: string,
  ): Promise<void> {
    const due = workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleString() : '';
    const users = await this.resolveWoStakeholders(workOrder, tenantId);

    for (const user of users) {
      await this.createNotification(
        user.id,
        NotificationType.WO_OVERDUE,
        'Work order overdue',
        `${workOrder.woNumber}${workOrder.title ? ` — ${workOrder.title}` : ''} is overdue (escalation level ${level})`,
        { workOrderId: workOrder.id, escalationLevel: level },
        tenantId,
      );

      if (user.email && user.notificationPreferences?.email_wo_overdue !== false) {
        await this.sendEmail(user.email, `Overdue: ${workOrder.woNumber}`, 'wo-overdue', {
          woNumber: workOrder.woNumber,
          title: workOrder.title,
          dueDate: due,
          level,
          woId: workOrder.id,
          appUrl: this.appUrl,
        });
      }

      await this.deliverExtraChannels(
        user,
        'Work order overdue',
        `${workOrder.woNumber}${workOrder.title ? ` — ${workOrder.title}` : ''} is overdue (level ${level})`,
        { workOrderId: workOrder.id, escalationLevel: level },
        tenantId,
      );
    }
  }

  /** Notify every member of a team that a work order was assigned to their team. */
  async onWorkOrderAssignedToTeam(
    workOrder: { id: string; woNumber: string; title?: string },
    memberUserIds: string[],
    teamName: string,
    tenantId: string,
  ): Promise<void> {
    const ids = [...new Set(memberUserIds.filter(Boolean))];
    if (ids.length === 0) return;

    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .where('user.id IN (:...ids)', { ids })
      .getMany();

    for (const user of users) {
      await this.createNotification(
        user.id,
        NotificationType.WO_ASSIGNED,
        `Work order assigned to ${teamName}`,
        `${workOrder.woNumber}${workOrder.title ? ` — ${workOrder.title}` : ''}`,
        { workOrderId: workOrder.id },
        tenantId,
      );

      if (user.email && user.notificationPreferences?.email_wo_assigned !== false) {
        await this.sendEmail(user.email, `Assigned to ${teamName}: ${workOrder.woNumber}`, 'wo-assigned', {
          woNumber: workOrder.woNumber,
          title: workOrder.title,
          woId: workOrder.id,
          appUrl: this.appUrl,
        });
      }

      await this.deliverExtraChannels(
        user,
        `Work order assigned to ${teamName}`,
        `${workOrder.woNumber}${workOrder.title ? ` — ${workOrder.title}` : ''}`,
        { workOrderId: workOrder.id },
        tenantId,
      );
    }
  }

  /**
   * Notify users @mentioned in a work-order comment. Mentioned ids are validated
   * to be members of the tenant (so a client can't notify arbitrary users), and
   * the author is never notified of their own mention.
   */
  async notifyCommentMentions(opts: {
    mentionUserIds: string[];
    authorUserId: string;
    authorName: string;
    snippet: string;
    workOrderId: string;
    commentId: string;
    tenantId: string;
  }): Promise<void> {
    const ids = [...new Set(opts.mentionUserIds.filter((id) => id && id !== opts.authorUserId))];
    if (ids.length === 0) return;

    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', {
        tenantId: opts.tenantId,
      })
      .where('user.id IN (:...ids)', { ids })
      .getMany();

    for (const user of users) {
      await this.createNotification(
        user.id,
        NotificationType.MENTION,
        `${opts.authorName} mentioned you`,
        opts.snippet,
        { workOrderId: opts.workOrderId, commentId: opts.commentId },
        opts.tenantId,
      );

      if (user.email && user.notificationPreferences?.email_mention !== false) {
        await this.sendEmail(user.email, `${opts.authorName} mentioned you`, 'mention', {
          authorName: opts.authorName,
          snippet: opts.snippet,
          woId: opts.workOrderId,
          appUrl: this.appUrl,
        });
      }
    }
  }
}
