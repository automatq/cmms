import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

const FROM = process.env.EMAIL_FROM || 'Nexly <noreply@nexly.local>';
const APP_NAME = 'Nexly';

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    // No-op if not configured (dev environments)
    console.log(`[email-sender] skip: ${subject} -> ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('[email-sender] failed:', err);
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
