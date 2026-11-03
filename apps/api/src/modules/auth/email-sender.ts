import { Resend } from 'resend';
import { Logger } from '@nestjs/common';

const logger = new Logger('EmailSender');

// Constructed lazily: the Resend client throws on an empty key, and this module
// is imported (via better-auth.ts) before ConfigModule has loaded .env.
let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM = process.env.EMAIL_FROM || 'MainTek <noreply@maintek.app>';
const APP_NAME = 'MainTek';

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn(`No RESEND_API_KEY set; skipping "${subject}" -> ${to}`);
    return;
  }

  try {
    const result = await getResend().emails.send({ from: FROM, to, subject, html });
    if (result.error) {
      logger.error(
        `Resend rejected "${subject}" -> ${to}: ${result.error.name}: ${result.error.message}`,
      );
      return;
    }
    logger.log(`Email sent: id=${result.data?.id} to=${to} subject="${subject}"`);
  } catch (err: any) {
    logger.error(`Resend send threw for "${subject}" -> ${to}: ${err?.message || err}`);
  }
}

export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  await send(
    to,
    `Verify your ${APP_NAME} email`,
    `<p>Welcome to ${APP_NAME}!</p>
     <p>Click the link below to verify your email address:</p>
     <p><a href="${url}">Verify email</a></p>
     <p>If you didn't sign up, you can ignore this email.</p>`,
  );
}

export async function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  await send(
    to,
    `Reset your ${APP_NAME} password`,
    `<p>Someone (hopefully you) requested a password reset for your ${APP_NAME} account.</p>
     <p><a href="${url}">Reset password</a></p>
     <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  );
}

export async function sendInvitationEmail(
  to: string,
  organizationName: string,
  inviterName: string | null,
  url: string,
): Promise<void> {
  const inviter = inviterName ? `<strong>${inviterName}</strong>` : 'Someone';
  await send(
    to,
    `You're invited to join ${organizationName} on ${APP_NAME}`,
    `<p>${inviter} has invited you to join <strong>${organizationName}</strong> on ${APP_NAME}.</p>
     <p><a href="${url}">Accept invitation</a></p>
     <p>This invitation expires in 48 hours.</p>`,
  );
}

interface AttachmentSpec {
  filename: string
  /** PDF Buffer or CSV string — Resend accepts both. */
  content: Buffer | string
}

/**
 * Send a scheduled-report email with the report attached. Used by
 * `report-export.processor.ts` once the report has been generated.
 * Falls back to a no-op log line if RESEND_API_KEY isn't configured,
 * matching the behavior of the other helpers in this file.
 */
export async function sendScheduledReportEmail(
  to: string | string[],
  reportTitle: string,
  attachment: AttachmentSpec,
): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to]
  if (!recipients.length) return

  if (!process.env.RESEND_API_KEY) {
    logger.warn(
      `No RESEND_API_KEY set; skipping scheduled report "${reportTitle}" to ${recipients.join(', ')}`,
    )
    return
  }

  const subject = `Your ${APP_NAME} ${reportTitle} report`
  const html = `<p>Your scheduled <strong>${reportTitle}</strong> report is attached.</p>
    <p>Generated at ${new Date().toLocaleString()}.</p>
    <p style="color:#666;font-size:12px">You're receiving this because a scheduled report
    delivery in ${APP_NAME} included this email address. Manage scheduled reports from
    your dashboard.</p>`

  // Resend expects base64-encoded content for binary attachments; pass
  // a Buffer directly when we have one (Resend SDK accepts it). For CSV
  // (string) we pass through unchanged.
  try {
    const result = await getResend().emails.send({
      from: FROM,
      to: recipients,
      subject,
      html,
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.content,
        },
      ],
    })
    if (result.error) {
      logger.error(
        `Resend rejected scheduled report "${reportTitle}" to ${recipients.join(', ')}: ${result.error.name}: ${result.error.message}`,
      )
      return
    }
    logger.log(
      `Scheduled report emailed: id=${result.data?.id} to=${recipients.join(', ')} title="${reportTitle}"`,
    )
  } catch (err: any) {
    logger.error(
      `Resend threw on scheduled report "${reportTitle}" to ${recipients.join(', ')}: ${err?.message || err}`,
    )
  }
}
