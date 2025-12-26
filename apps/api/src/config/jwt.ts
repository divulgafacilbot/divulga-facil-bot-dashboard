export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'fallback-secret-for-development',
  expiresIn: '15m', // 15 minutes (short-lived access token)
  cookieName: 'auth_token',
  refreshTokenCookieName: 'refresh_token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes
  },
  refreshCookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/auth/refresh', // Only sent to refresh endpoint
  },
};
