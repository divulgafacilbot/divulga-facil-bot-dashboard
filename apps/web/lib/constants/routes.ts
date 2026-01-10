/**
 * Centralized route definitions
 * All application routes are defined here for type-safety and maintainability
 */

export const ROUTES = {
  dashboard: {
    home: '/dashboard',
    bots: '/dashboard/bots',
    templates: '/dashboard/templates',
    billing: '/dashboard/billing',
    support: '/dashboard/support',
    settings: '/dashboard/settings',
    promotional: '/dashboard/promotional',
    publicPage: '/dashboard/pagina-publica',
  },
  auth: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    verifyEmail: '/verify-email',
  },
  admin: {
    home: '/admin',
    users: '/admin/users',
    support: '/admin/support',
    templates: '/admin/templates',
    campaigns: '/admin/campaigns',
    promoTokens: '/admin/promo-tokens',
    bots: '/admin/bots',
    usage: '/admin/usage',
    finance: '/admin/finance',
    permissions: '/admin/permissions',
    settings: '/admin/settings',
    login: '/admin/login',
  },
  public: {
    profile: (slug: string) => `/${slug}`,
    card: (slug: string, cardSlug: string) => `/${slug}/${cardSlug}`,
  },
} as const;

export type Routes = typeof ROUTES;
