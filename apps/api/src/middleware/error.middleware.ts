import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Don't expose stack traces in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor'
    : err.message;

  res.status(500).json({
    error: message,
  });
};
