export const emailConfig = {
  host: process.env.EMAIL_SMTP_HOST!,
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: process.env.EMAIL_SMTP_PORT === '465',
  auth: {
    user: process.env.EMAIL_SMTP_USER!,
    pass: process.env.EMAIL_SMTP_PASS!,
  },
  from: process.env.EMAIL_FROM!,
};
