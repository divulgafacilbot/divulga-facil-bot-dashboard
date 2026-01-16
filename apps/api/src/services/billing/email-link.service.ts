import { prisma } from '../../db/prisma.js';
import { addMinutes } from 'date-fns';
import nodemailer from 'nodemailer';
import { emailConfig } from '../../config/email.js';

// Link code expiry time in minutes
const LINK_CODE_EXPIRY_MINUTES = 10;

// Create transporter for sending emails
const transporter = nodemailer.createTransport(emailConfig);

/**
 * Send an email
 */
async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  await transporter.sendMail({
    from: emailConfig.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

export class EmailLinkService {
  /**
   * Generate a 6-digit code
   */
  private static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Request an email link code
   * Generates a 6-digit code and sends it to the email
   */
  static async requestLinkCode(userId: string, email: string): Promise<void> {
    // Generate code
    const code = this.generateCode();
    const expiresAt = addMinutes(new Date(), LINK_CODE_EXPIRY_MINUTES);

    // Delete any existing codes for this user
    await prisma.email_link_codes.deleteMany({
      where: { user_id: userId },
    });

    // Create new code
    await prisma.email_link_codes.create({
      data: {
        user_id: userId,
        email,
        code,
        expires_at: expiresAt,
      },
    });

    // Send email with code
    await sendEmail({
      to: email,
      subject: 'Código de vinculação - Divulga Fácil',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Código de Vinculação</h2>
          <p>Use o código abaixo para vincular seu email de compra à sua conta:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
              ${code}
            </span>
          </div>
          <p style="color: #666; font-size: 14px;">
            Este código expira em ${LINK_CODE_EXPIRY_MINUTES} minutos.
          </p>
          <p style="color: #666; font-size: 14px;">
            Se você não solicitou este código, ignore este email.
          </p>
        </div>
      `,
    });
  }

  /**
   * Validate a link code
   */
  static async validateLinkCode(userId: string, code: string): Promise<{ valid: boolean; email?: string }> {
    const linkCode = await prisma.email_link_codes.findFirst({
      where: {
        user_id: userId,
        code,
        used_at: null,
      },
    });

    if (!linkCode) {
      return { valid: false };
    }

    // Check expiry
    if (linkCode.expires_at < new Date()) {
      return { valid: false };
    }

    // Mark as used
    await prisma.email_link_codes.update({
      where: { id: linkCode.id },
      data: { used_at: new Date() },
    });

    return { valid: true, email: linkCode.email };
  }

  /**
   * Link Kiwify customer to user
   * This is called after code validation to find and link the subscription
   */
  static async linkKiwifyCustomer(userId: string, email: string): Promise<boolean> {
    // Look for Kiwify events with this email
    const kiwifyEvent = await prisma.kiwify_events.findFirst({
      where: {
        processing_status: 'PROCESSED',
      },
      orderBy: {
        received_at: 'desc',
      },
    });

    if (!kiwifyEvent) {
      return false;
    }

    const payload = kiwifyEvent.payload as any;

    // Check if customer email matches
    if (payload.customer_email?.toLowerCase() !== email.toLowerCase()) {
      // Try to find event with matching email
      const events = await prisma.kiwify_events.findMany({
        where: {
          processing_status: 'PROCESSED',
        },
        orderBy: {
          received_at: 'desc',
        },
        take: 100,
      });

      const matchingEvent = events.find((e) => {
        const p = e.payload as any;
        return p.customer_email?.toLowerCase() === email.toLowerCase();
      });

      if (!matchingEvent) {
        return false;
      }

      const matchingPayload = matchingEvent.payload as any;
      const customerId = matchingPayload.customer_id;

      if (customerId) {
        await prisma.subscriptions.updateMany({
          where: { user_id: userId },
          data: { kiwify_customer_id: customerId },
        });
        return true;
      }
    }

    const customerId = payload.customer_id;
    if (customerId) {
      await prisma.subscriptions.updateMany({
        where: { user_id: userId },
        data: { kiwify_customer_id: customerId },
      });
      return true;
    }

    return false;
  }
}
