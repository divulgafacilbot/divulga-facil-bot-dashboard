"use client";

import { Button } from "@/components/forms/Button";
import { api, IS_PRODUCTION } from "@/lib/api";
import { BOT_NAME } from "@/lib/constants";
import { UserRole } from "@/lib/common-enums";
import type { User } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const SidebarContext = createContext<{ sidebarCollapsed: boolean }>({
  sidebarCollapsed: false,
});

export const useSidebar = () => useContext(SidebarContext);

// MOCK USER - HARDCODED
const MOCK_USER: User = {
  id: 'mock-user-id',
  email: 'teste@divulgafacil.com.br',
  role: UserRole.USER,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(MOCK_USER); // MOCK USER DIRECTLY
  const [loading, setLoading] = useState(false); // NO LOADING
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // NO useEffect - user is already set above

  const handleLogout = async () => {
    await api.auth.logout();
    router.push("/login");
  };

  const handleGoToLogin = () => {
    router.push("/login");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const navItems = useMemo(
    () => [
      {
        name: "Visão geral",
        href: "/dashboard",
        icon:
          "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
      {
        name: "Meus bots",
        href: "/dashboard/bots",
        icon:
          "M7.5 4.5h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9a3 3 0 013-3zM9 10.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm6 0a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zM9 16.5h6",
      },
      {
        name: "Editar templates",
        href: "/dashboard/templates",
        icon:
          "M7.5 3.75h6l4.5 4.5v11.25A2.25 2.25 0 0115.75 21.75H7.5A2.25 2.25 0 015.25 19.5V6A2.25 2.25 0 017.5 3.75zM13.5 3.75V8.25H18M8.25 12h7.5M8.25 15.75h7.5M8.25 19.5h4.5",
      },
      {
        name: "Pagamentos",
        href: "/dashboard/billing",
        icon:
          "M2.25 6.75h19.5v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75zm0 0V5.25A2.25 2.25 0 014.5 3h15a2.25 2.25 0 012.25 2.25v1.5M3.75 12h6",
      },
      {
        name: "Configurações",
        href: "/dashboard/settings",
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
      <header
        className="border-b border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)]"
        style={{
          height: '100px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40
        }}
      >
        <div className="mx-auto flex h-full w-full items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-base font-bold text-white shadow-[var(--shadow-primary)]">
              <Image
                src="/logo-v2.png"
                alt="Posting Bot"
                width={50}
                height={50}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-primary)]" style={{ margin: 0 }}>
                {BOT_NAME}
              </p>
              <p className="text-xl font-bold" style={{ margin: 0 }}>Seu painel</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost">
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sair
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? '50px' : '260px',
          position: 'fixed',
          left: 0,
          top: '100px',
          bottom: 0,
          transition: 'width 300ms ease-in-out',
        }}
        className="border-r border-[var(--color-border)] bg-white shadow-[var(--shadow-md)] z-30 relative"
      >
        <nav className={`flex flex-col gap-2 text-sm ${sidebarCollapsed ? 'p-2' : 'p-6'}`}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
            top: '124px',
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
        style={{
          marginLeft: sidebarCollapsed ? '50px' : '260px',
          paddingTop: '100px',
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
