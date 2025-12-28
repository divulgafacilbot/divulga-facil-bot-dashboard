"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <>
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-main)]">
          Visão geral
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Acompanhe suas métricas e gerencie seus bots
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Bots ativos
            </p>
            <div className="rounded-lg bg-[color:rgba(245,61,45,0.1)] p-2">
              <svg
                className="h-5 w-5 text-[var(--color-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7.5 4.5h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9a3 3 0 013-3z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            0
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Nenhum bot configurado ainda
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Templates
            </p>
            <div className="rounded-lg bg-[color:rgba(45,106,239,0.1)] p-2">
              <svg
                className="h-5 w-5 text-[var(--color-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7.5 3.75h6l4.5 4.5v11.25A2.25 2.25 0 0115.75 21.75H7.5A2.25 2.25 0 015.25 19.5V6A2.25 2.25 0 017.5 3.75z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            0
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Configure seus templates
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Publicações
            </p>
            <div className="rounded-lg bg-[color:rgba(34,197,94,0.1)] p-2">
              <svg
                className="h-5 w-5 text-[var(--color-success)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            0
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Neste mês
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-md)]">
        <h2 className="text-xl font-bold text-[var(--color-text-main)]">
          Primeiros passos
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Configure sua conta para começar a usar o bot
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/dashboard/bots"
            className="group rounded-xl border-2 border-[var(--color-border)] bg-white p-6 transition-all hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-[color:rgba(245,61,45,0.1)] p-3 group-hover:bg-[var(--color-primary)] transition-colors">
                <svg
                  className="h-6 w-6 text-[var(--color-primary)] group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-primary)] transition-colors">
                  Criar primeiro bot
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Configure um bot para começar a publicar
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/templates"
            className="group rounded-xl border-2 border-[var(--color-border)] bg-white p-6 transition-all hover:border-[var(--color-secondary)] hover:shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-[color:rgba(45,106,239,0.1)] p-3 group-hover:bg-[var(--color-secondary)] transition-colors">
                <svg
                  className="h-6 w-6 text-[var(--color-secondary)] group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7.5 3.75h6l4.5 4.5v11.25M8.25 12h7.5"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-secondary)] transition-colors">
                  Personalizar templates
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Ajuste os templates de publicação
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
