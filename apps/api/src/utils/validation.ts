import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
  password: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula')
    .regex(/\d/, 'A senha deve conter ao menos um número'),
});

export const loginSchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula')
    .regex(/\d/, 'A senha deve conter ao menos um número'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'A senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(8, 'A senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula')
      .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula')
      .regex(/\d/, 'A senha deve conter ao menos um número'),
    confirmPassword: z.string().min(1, 'Confirme sua nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
