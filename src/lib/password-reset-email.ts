/**
 * Password reset email adapter interface.
 * 
 * IMPLEMENTATION REQUIREMENT:
 * Before production password reset can function, a real email provider must be configured:
 * - Resend (recommended for Vercel)
 * - SendGrid
 * - SMTP transport
 * - AWS SES
 * 
 * Environment variables required (example for Resend):
 * - RESEND_API_KEY: API key from Resend dashboard
 * - FROM_EMAIL: verified sender address
 * 
 * Security requirements:
 * - Never log reset token or full reset URL
 * - Use HTTPS-only reset URL
 * - Include token expiration notice in email
 * - Use plain token in URL, not hashed value
 */

export interface PasswordResetEmailMessage {
  recipient: string;
  resetToken: string;
}

export interface EmailProvider {
  send(message: PasswordResetEmailMessage): Promise<boolean>;
}

class PlaceholderEmailProvider implements EmailProvider {
  async send(_message: PasswordResetEmailMessage): Promise<boolean> {
    return false;
  }
}

const provider: EmailProvider = new PlaceholderEmailProvider();

export async function sendPasswordResetEmail(message: PasswordResetEmailMessage): Promise<boolean> {
  return provider.send(message);
}

export function isPasswordResetEmailConfigured(): boolean {
  return provider.constructor.name !== "PlaceholderEmailProvider";
}
