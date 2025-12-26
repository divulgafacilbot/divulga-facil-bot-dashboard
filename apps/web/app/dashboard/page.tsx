"use client";

import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await api.user.getMe();
        setUser(userData);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const handleResendVerification = async (email: string) => {
    try {
      setResendLoading(true);
      setResendSuccess(false);
      await api.auth.resendVerification(email);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      console.error("Erro ao reenviar:", error);
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading" />
      </div>
    );
  }

  return (
    <>
          {/* Email verification warning banner */}
          {user && !user.emailVerified && (
            <div className="rounded-2xl border-2 border-[var(--color-warning)] bg-[color:rgba(245,158,11,0.1)] p-6 shadow-[var(--shadow-md)] animate-[slideDown_0.3s_ease-out]">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-warning)]">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                      Seu e-mail ainda não foi verificado
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      Verifique sua caixa de entrada e clique no link de verificação que enviamos para{" "}
                      <strong className="text-[var(--color-text-main)]">{user.email}</strong>
                    </p>
                  </div>
                  {resendSuccess ? (
                    <div className="rounded-lg bg-[color:rgba(34,197,94,0.1)] border border-[var(--color-success)] px-4 py-2 text-sm font-semibold text-[var(--color-success)]">
                      Link reenviado! Verifique seu e-mail.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleResendVerification(user.email)}
                      disabled={resendLoading}
                      className="rounded-lg border-2 border-[var(--color-warning)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-warning)] transition-all hover:bg-[var(--color-warning)] hover:text-white disabled:opacity-50"
                    >
                      {resendLoading ? "Enviando..." : "Reenviar link de verificação"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="group rounded-2xl border border-[var(--color-border)] bg-gradient-glass p-8 shadow-[var(--shadow-lg)] backdrop-blur-sm transition-all hover:shadow-[var(--shadow-xl)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-success)]">
                  <span className="flex h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                  Sessão ativa
                </p>
                <h1 className="text-3xl font-bold text-[var(--color-text-main)]">
                  Olá, {user?.name} {user?.email}!
                </h1>
                <p className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {user?.email}
                </p>
                <p className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]">
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
                      d="M13 16h-1v-4h-1m1-4h.01M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17z"
                    />
                  </svg>
                  Acompanhe o status do seu plano e seus bots
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[var(--color-text-main)] shadow-[var(--shadow-sm)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]"></span>
                  Plano ativo
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[var(--color-text-main)] shadow-[var(--shadow-sm)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-info)]"></span>
                  2 bots liberados
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                label: "Artes geradas hoje",
                value: "30",
                icon:
                  "M3 3h18v18H3V3zm4 4h6v6H7V7zm8 0h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zM7 15h6v2H7v-2z",
                color: "var(--color-primary)",
              },
              {
                label: "Downloads de multimídia",
                value: "12",
                icon:
                  "M12 16l4-4m0 0l-4-4m4 4H8m12 4v1a3 3 0 01-3 3H7a3 3 0 01-3-3v-1m14-4V7a3 3 0 00-3-3H9a3 3 0 00-3 3v5",
                color: "var(--color-info)",
              },

            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: stat.color }}
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={stat.icon}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <h2 className="text-xl font-bold text-[var(--color-text-main)]">
              Ações rápidas
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Conecte seus bots, ajuste templates e acompanhe o uso diário.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Conectar Telegram",
                  description: "Gere seu token e conecte os bots contratados.",
                },
                {
                  title: "Editar templates",
                  description: "Personalize cores, fontes e CTA das artes.",
                },
                {
                  title: "Assinatura",
                  description: "Veja seu plano ativo e data de renovação.",
                },
              ].map((action) => (
                <div
                  key={action.title}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4"
                >
                  <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
                    {action.title}
                  </h3>
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                    {action.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
    </>
  );
}
