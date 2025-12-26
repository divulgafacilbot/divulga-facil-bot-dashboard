import nodemailer from 'nodemailer';
import { emailConfig } from '../../config/email.js';

const transporter = nodemailer.createTransport(emailConfig);

export class EmailService {
  private static async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📧 Attempting to send email to ${to} with subject: ${subject}`);
      const info = await transporter.sendMail({
        from: emailConfig.from,
        to,
        subject,
        html,
      });
      console.log(`✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Email send error:', {
        to,
        subject,
        error: error.message,
        code: error.code,
        command: error.command,
      });
      return { success: false, error: error.message || String(error) };
    }
  }

  static async sendPasswordResetEmail(
    email: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${process.env.APP_BASE_URL}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F53D2D;">Redefinir sua senha</h2>
        <p>Você solicitou a redefinição de senha. Clique no link abaixo para continuar:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #F53D2D; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Redefinir senha
        </a>
        <p>Este link expira em 1 hora.</p>
        <p>Se você não solicitou isso, ignore este e-mail.</p>
      </div>
    `;

    return this.sendEmail(email, 'Redefinir sua senha - Posting Bot', html);
  }

  static async sendEmailVerificationEmail(
    email: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    const verifyUrl = `${process.env.APP_BASE_URL}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F53D2D;">Verifique seu e-mail</h2>
        <p>Bem-vindo ao Posting Bot! Para começar a usar a plataforma, confirme seu e-mail clicando no link abaixo:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #F53D2D; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Verificar e-mail
        </a>
        <p>Este link expira em 24 horas.</p>
        <p>Se você não criou uma conta, ignore este e-mail.</p>
      </div>
    `;

    return this.sendEmail(email, 'Verifique seu e-mail - Posting Bot', html);
  }
}
