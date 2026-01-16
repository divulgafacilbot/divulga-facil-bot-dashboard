import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { EmailLinkService } from '../../services/billing/email-link.service.js';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(requireAuth);

const requestLinkSchema = z.object({
  email: z.string().email('Email inválido'),
});

const confirmLinkSchema = z.object({
  code: z.string().length(6, 'Código deve ter 6 dígitos'),
});

/**
 * POST /user/billing/request-link
 * Request a code to link Kiwify purchase email
 */
router.post('/request-link', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const validation = requestLinkSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const { email } = validation.data;

    await EmailLinkService.requestLinkCode(userId, email);

    res.json({
      success: true,
      message: 'Código enviado para o email informado',
    });
  } catch (error) {
    console.error('Request link error:', error);
    res.status(500).json({
      error: 'Erro ao enviar código',
      message: 'Tente novamente mais tarde',
    });
  }
});

/**
 * POST /user/billing/confirm-link
 * Validate code and link Kiwify account
 */
router.post('/confirm-link', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const validation = confirmLinkSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const { code } = validation.data;

    // Validate code
    const result = await EmailLinkService.validateLinkCode(userId, code);

    if (!result.valid || !result.email) {
      return res.status(400).json({
        error: 'Código inválido ou expirado',
        message: 'Solicite um novo código',
      });
    }

    // Link Kiwify customer
    const linked = await EmailLinkService.linkKiwifyCustomer(userId, result.email);

    if (!linked) {
      return res.status(404).json({
        error: 'Compra não encontrada',
        message: 'Não encontramos uma compra com este email. Verifique se o email está correto.',
      });
    }

    res.json({
      success: true,
      message: 'Conta vinculada com sucesso!',
    });
  } catch (error) {
    console.error('Confirm link error:', error);
    res.status(500).json({
      error: 'Erro ao vincular conta',
      message: 'Tente novamente mais tarde',
    });
  }
});

export default router;
