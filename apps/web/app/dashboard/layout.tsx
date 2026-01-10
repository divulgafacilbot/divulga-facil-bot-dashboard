"use client";

import { Button } from "@/components/forms/Button";
import { api, IS_PRODUCTION } from "@/lib/api";
import { UserRole } from "@/lib/common-enums";
import { ROUTES } from "@/lib/constants";
import type { User } from "@/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/common/AppHeader";

const SidebarContext = createContext<{ sidebarCollapsed: boolean }>({
  sidebarCollapsed: false,
});

export const useSidebar = () => useContext(SidebarContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [closedTicketsCount, setClosedTicketsCount] = useState(0);

  useEffect(() => {
    async function loadUser() {
      // PRODUCTION MODE: Set mock user directly without any API call
      if (IS_PRODUCTION) {
        console.log('🏭 PRODUCTION: Setting mock user directly');
        const mockUser: User = {
          id: 'mock-user-id',
          email: 'teste@divulgafacil.com.br',
          role: UserRole.USER,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(mockUser);
        setLoading(false);
        return;
      }

      // DEVELOPMENT MODE: Normal flow
      console.log('🔧 Dashboard: Loading user from API...');
      try {
        const userData = await api.user.getMe();
        console.log('✅ Dashboard: User loaded:', userData.email);
        setUser(userData);
      } catch (error) {
        console.error('❌ Dashboard: Failed to load user, redirecting to login');
        setLoadError(error as Error);
        router.push(ROUTES.auth.login);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/support/tickets/closed-count`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setClosedTicketsCount(data?.data?.count || 0);
      })
      .catch(() => setClosedTicketsCount(0));
  }, []);

  useEffect(() => {
    if (pathname.startsWith(ROUTES.dashboard.support)) {
      setClosedTicketsCount(0);
    }
  }, [pathname]);

  const handleLogout = async () => {
    await api.auth.logout();
    router.push(ROUTES.auth.login);
  };

  const handleGoToLogin = () => {
    router.push(ROUTES.auth.login);
    if (typeof window !== "undefined") {
      window.location.href = ROUTES.auth.login;
    }
  };

  const navItems = useMemo(
    () => [
      {
        name: "Visão geral",
        href: ROUTES.dashboard.home,
        icon:
          "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
      {
        name: "Meus bots",
        href: ROUTES.dashboard.bots,
        icon:
          "M7.5 4.5h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9a3 3 0 013-3zM9 10.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm6 0a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zM9 16.5h6",
      },
      {
        name: "Editar templates",
        href: ROUTES.dashboard.templates,
        icon:
          "M7.5 3.75h6l4.5 4.5v11.25A2.25 2.25 0 0115.75 21.75H7.5A2.25 2.25 0 015.25 19.5V6A2.25 2.25 0 017.5 3.75zM13.5 3.75V8.25H18M8.25 12h7.5M8.25 15.75h7.5M8.25 19.5h4.5",
      },
      {
        name: "Material promocional",
        href: ROUTES.dashboard.promotional,
        icon:
          "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
      },
      {
        name: "Página Pública",
        href: ROUTES.dashboard.publicPage,
        icon:
          "M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z",
      },
      {
        name: "Pagamentos",
        href: ROUTES.dashboard.billing,
        icon:
          "M2.25 6.75h19.5v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75zm0 0V5.25A2.25 2.25 0 014.5 3h15a2.25 2.25 0 012.25 2.25v1.5M3.75 12h6",
      },
      {
        name: "FAQ e Suporte",
        href: ROUTES.dashboard.support,
        icon:
          "M12 18h.01M9.75 9.75a2.25 2.25 0 1 1 4.5 0c0 .998-.804 1.803-1.5 2.25-.696.447-1.5 1.252-1.5 2.25v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      },
      {
        name: "Configurações",
        href: ROUTES.dashboard.settings,
        icon:
          "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <span className="loading" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-md)]">
          <p className="text-sm font-semibold text-[var(--color-text-main)]">
            {loadError ? "Nao foi possivel carregar seus dados." : "Carregando dados do usuario."}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Tente novamente ou refaca o login.
          </p>
          <Button type="button" onClick={handleGoToLogin} className="mt-5">
            Ir para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarContext.Provider value={{ sidebarCollapsed }}>
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)]">
      <AppHeader variant="dashboard" onLogout={handleLogout} />

      {/* Skip Link */}
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? '50px' : '260px',
          position: 'fixed',
          left: 0,
          top: '70px',
          bottom: 0,
          transition: 'width 300ms ease-in-out',
        }}
        className="border-r border-[var(--color-border)] bg-white shadow-[var(--shadow-md)] z-30 relative"
      >
        <nav aria-label="Menu principal" className={`flex flex-col gap-2 text-sm ${sidebarCollapsed ? 'p-2' : 'p-6'}`}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== ROUTES.dashboard.home && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={sidebarCollapsed ? item.name : undefined}
                className={`group flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'
                  } rounded-xl py-3 text-left font-semibold transition-all duration-200 ${isActive
                    ? "bg-white text-[var(--color-primary)] shadow-[var(--shadow-sm)] border-2 border-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[color:rgba(245,61,45,0.05)] hover:text-[var(--color-primary)]"
                  }`}
              >
                <svg
                  className="h-5 w-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.icon}
                  />
                </svg>
                {!sidebarCollapsed && <span>{item.name}</span>}
                {!sidebarCollapsed && item.href === ROUTES.dashboard.support && closedTicketsCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {closedTicketsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'fixed',
            left: sidebarCollapsed ? '34px' : '244px',
            top: '94px',
            zIndex: 50,
            transition: 'left 300ms ease-in-out',
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] shadow-[var(--shadow-md)] transition-all duration-200 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:shadow-[var(--shadow-lg)]"
          aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
      </aside>

      {/* Main Content */}
      <main
        id="main-content"
        style={{
          marginLeft: sidebarCollapsed ? '50px' : '260px',
          paddingTop: '70px',
          transition: 'margin-left 300ms ease-in-out',
        }}
      >
        <div className="px-8 py-10">
          <section className="mx-auto w-full max-w-[1490px] flex flex-col gap-8">
            {children}
          </section>
        </div>
      </main>
    </div>
    </SidebarContext.Provider>
  );
}
