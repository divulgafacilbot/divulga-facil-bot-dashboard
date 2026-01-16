'use client';

import AppHeader from '@/components/common/AppHeader';
import { getAdminToken, getAdminUser } from '@/lib/admin-auth';
import { AdminPermission, AdminRole } from '@/lib/admin-enums';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type AdminUser = {
  email: string;
  role: AdminRole;
  permissions?: AdminPermission[];
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSupportCount, setOpenSupportCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const initialToken = getAdminToken();
    setToken(initialToken);
    if (!initialToken) {
      setLoading(false);
      router.push(ROUTES.admin.login);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/auth/me`, {
      headers: { Authorization: `Bearer ${initialToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success) {
          throw new Error('Auth failed');
        }
        setAdmin(data.admin);
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
        sessionStorage.setItem('admin_user', JSON.stringify(data.admin));
      })
      .catch(() => {
        router.push(ROUTES.admin.login);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (!token) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const source = new EventSource(
      `${baseUrl}/api/admin/support/stream?token=${encodeURIComponent(token)}`
    );

    const handleStats = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const openTickets = data?.openTickets || 0;
        const inProgress = data?.inProgressTickets || 0;
        setOpenSupportCount(openTickets + inProgress);
      } catch (_error) {
        setOpenSupportCount(0);
      }
    };

    source.addEventListener('support-stats', handleStats);
    source.onerror = () => {
      source.close();
    };

    return () => {
      source.removeEventListener('support-stats', handleStats);
      source.close();
    };
  }, [token]);

  useEffect(() => {
    const handleAuthChange = () => {
      const nextToken = getAdminToken();
      setToken(nextToken);
      if (!nextToken) {
        setAdmin(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/auth/me`, {
        headers: { Authorization: `Bearer ${nextToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data?.success) {
            throw new Error('Auth failed');
          }
          setAdmin(data.admin);
          localStorage.setItem('admin_user', JSON.stringify(data.admin));
          sessionStorage.setItem('admin_user', JSON.stringify(data.admin));
        })
        .catch(() => {
          router.push(ROUTES.admin.login);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('admin-auth-changed', handleAuthChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('admin-auth-changed', handleAuthChange as EventListener);
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    window.dispatchEvent(new Event('admin-auth-changed'));
    router.push(ROUTES.admin.login);
  };

  if (pathname === ROUTES.admin.login) {
    return <>{children}</>;
  }

  const navigation = [
    { name: 'Visão geral', href: ROUTES.admin.home, permission: AdminPermission.OVERVIEW },
    { name: 'Gestão de Usuários', href: ROUTES.admin.users, permission: AdminPermission.USERS },
    { name: 'Métricas de Bots', href: ROUTES.admin.bots, permission: AdminPermission.BOTS },
    { name: 'Métricas de Uso', href: ROUTES.admin.usage, permission: AdminPermission.USAGE },
    { name: 'Gestão de Templates', href: ROUTES.admin.templates, permission: AdminPermission.TEMPLATES },
    { name: 'Criar Campanhas', href: ROUTES.admin.campaigns, permission: AdminPermission.CAMPAIGNS },
    { name: 'Tokens Promocionais', href: ROUTES.admin.promoTokens, permission: AdminPermission.PROMO_TOKENS },
    { name: 'Suporte ao cliente', href: ROUTES.admin.support, permission: AdminPermission.SUPPORT },
    { name: 'Gestão do Financeiro', href: ROUTES.admin.finance, permission: AdminPermission.FINANCE },
    { name: 'Produtos Kiwify', href: ROUTES.admin.kiwifyProducts, permission: AdminPermission.FINANCE },
    { name: 'Gestão de Colaboradores', href: ROUTES.admin.permissions, permission: AdminPermission.PERMISSIONS },
  ];

  const permissions = Array.isArray(admin?.permissions) ? admin.permissions : [];

  const filteredNav = navigation.filter((item) => {
    if (item.permission === AdminPermission.OVERVIEW) {
      return true;
    }
    if (item.permission === AdminPermission.PERMISSIONS) {
      return admin?.role === AdminRole.ADMIN_MASTER;
    }
    return admin?.role === AdminRole.ADMIN_MASTER || permissions.includes(item.permission);
  });

  const sidebarContent = loading ? (
    <div className="p-5 border-b border-[var(--color-border)] animate-pulse">
      <div className="h-3 w-16 rounded bg-blue-100" />
      <div className="mt-3 h-5 w-40 rounded bg-slate-200" />
      <div className="mt-3 h-3 w-32 rounded bg-slate-200" />
    </div>
  ) : (
    <div className="p-5 border-b border-[var(--color-border)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2D6AEF]">
        Admin
      </p>
      <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
      <p className="text-sm text-gray-600">{admin?.email}</p>
    </div>
  );

  const navigationContent = loading ? (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-10 rounded-xl bg-slate-100" />
      ))}
    </div>
  ) : (
    <nav aria-label="Menu administrativo" className="p-4 space-y-2 text-sm">
      {filteredNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`block rounded-xl px-4 py-3 font-semibold transition ${pathname === item.href
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'text-gray-700 hover:bg-blue-50/60 hover:text-blue-700'
            }`}
        >
          <span className="flex items-center justify-between gap-2">
            <span>{item.name}</span>
            {item.permission === AdminPermission.SUPPORT && openSupportCount > 0 && (
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                {openSupportCount}
              </span>
            )}
          </span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff4ff,_#f2f2f2_55%)]">
      <AppHeader variant="admin" onLogout={handleLogout} />

      {/* Skip Link */}
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>

      <div className="pt-[70px]">
        {/* Sidebar */}
        <aside className="fixed left-0 top-[70px] z-30 h-[calc(100vh-70px)] w-64 bg-white shadow-[var(--shadow-md)] border-r border-[var(--color-border)]">
          <div className="flex h-full flex-col">
            {sidebarContent}
            <div className="flex-1">{navigationContent}</div>
            <div className="border-t border-[var(--color-border)] p-4">
              <Link
                href={ROUTES.admin.settings}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${pathname === ROUTES.admin.settings
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-blue-50/60 hover:text-blue-700'
                  }`}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Configurações
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main id="main-content" className="ml-64 p-8">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
            {loading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-36 rounded-3xl bg-white shadow-[var(--shadow-sm)] animate-pulse" />
                ))}
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
