"use client";

import Link from "next/link";
import { Button } from "@/components/forms/Button";
import { BOT_NAME, ROUTES } from "@/lib/constants";
import Image from "next/image";

type HeaderVariant = "home" | "auth" | "dashboard" | "admin";

type AppHeaderProps = {
  variant: HeaderVariant;
  onLogout?: () => void;
};

const LogoTitle = ({ href }: { href?: string }) => {
  const logo = (
    <div className="flex items-center gap-1">
      <Image
        src="/logo-bot-bg.png"
        alt={BOT_NAME}
        width={36}
        height={36}
        className="h-9 w-9 object-contain"
        priority
      />
      <span className="text-lg font-black italic tracking-tight">
        <span className="text-white">Divulga</span>{" "}
        <span className="text-[#FBBF24]">Fácil</span>
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {logo}
      </Link>
    );
  }

  return logo;
};

export default function AppHeader({ variant, onLogout }: AppHeaderProps) {
  if (variant === "dashboard" || variant === "admin") {
    const isAdmin = variant === "admin";
    const logoHref = isAdmin ? "/admin" : "/dashboard";
    return (
      <header
        className={`fixed left-0 right-0 top-0 z-40 border-b border-[var(--color-border)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] ${
          isAdmin ? "bg-[#FF308E]" : "bg-[#FF308E]"
        }`}
        style={{
          height: "70px",
        }}
      >
        <div className="mx-auto flex h-full w-full items-center justify-between px-6 py-3">
          <LogoTitle href={logoHref} />
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="ghost"
              className="border-white/30 bg-white/10 py-2 text-white shadow-[var(--shadow-sm)] hover:border-white/60 hover:bg-white/20"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sair
            </Button>
          )}
        </div>
      </header>
    );
  }

  if (variant === "auth" || variant === "home") {
    return (
      <header className="fixed left-0 right-0 top-0 z-40 h-[70px] bg-[#FF308E] text-[var(--color-text-inverse)]">
        <div className="mx-auto flex h-full w-full items-center justify-between px-6 py-3">
          <LogoTitle href="/" />
          <nav aria-label="Ações de autenticação" className="flex flex-nowrap items-center gap-3 text-sm font-semibold">
            <Link
              className="rounded-[var(--radius-sm)] border border-white/30 bg-white/10 px-4 py-2 text-white shadow-[var(--shadow-sm)] transition hover:border-white/60 hover:bg-white/20"
              href={ROUTES.auth.login}
            >
              Entrar
            </Link>
            <Link
              className="rounded-[var(--radius-sm)] bg-[var(--color-secondary)] px-4 py-2 text-white shadow-[var(--shadow-md)] transition hover:opacity-90"
              href={ROUTES.auth.register}
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return null;
}
