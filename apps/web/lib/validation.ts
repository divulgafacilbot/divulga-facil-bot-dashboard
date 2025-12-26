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
  newPassword: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula')
    .regex(/\d/, 'A senha deve conter ao menos um número'),
});
