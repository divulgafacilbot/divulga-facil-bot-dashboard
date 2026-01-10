import { Request, Response, NextFunction } from 'express';

const INTERNAL_JOBS_SECRET = process.env.INTERNAL_JOBS_SECRET;

if (!INTERNAL_JOBS_SECRET) {
  console.warn('[InternalJobAuth] INTERNAL_JOBS_SECRET não configurado!');
}

export async function requireInternalJobAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const secret = req.headers['x-internal-job-secret'];

  if (!secret || secret !== INTERNAL_JOBS_SECRET) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or missing x-internal-job-secret header',
    });
    return;
  }

  next();
}
