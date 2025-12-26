"use client";

import { Button } from "@/components/forms/Button";
import { Input } from "@/components/forms/Input";
import { api } from "@/lib/api";
import type { LoginHistoryEntry, User } from "@/types";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formValues, setFormValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, historyResponse] = await Promise.all([
          api.user.getMe(),
          api.user.getLoginHistory(10),
        ]);
        setUser(userData);
        setLoginHistory(historyResponse.history);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setUserLoading(false);
        setHistoryLoading(false);
      }
    };

    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getPasswordRequirements = (password: string) => ({
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  });

  const getPasswordError = (password: string) => {
    if (!password) {
      return "";
    }
    if (password.length < 8) {
      return "Minimo de 8 caracteres.";
    }
    if (!/[A-Z]/.test(password)) {
      return "Inclua uma letra maiuscula.";
    }
    if (!/[a-z]/.test(password)) {
      return "Inclua uma letra minuscula.";
    }
    if (!/\d/.test(password)) {
      return "Inclua um numero.";
    }
    return "";
  };

  const passwordRequirements = getPasswordRequirements(formValues.newPassword);
  const newPasswordError = getPasswordError(formValues.newPassword);
  const confirmPasswordError =
    formValues.confirmPassword && formValues.newPassword !== formValues.confirmPassword
      ? "As senhas não conferem."
      : "";

  const handleChange =
    (field: keyof typeof formValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const resetForm = () => {
    setFormValues({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setFormError("");
    setFormSuccess("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (newPasswordError) {
      setFormError(newPasswordError);
      return;
    }
    if (confirmPasswordError) {
      setFormError(confirmPasswordError);
      return;
    }

    try {
      setLoading(true);
      await api.user.changePassword(
        formValues.currentPassword,
        formValues.newPassword,
        formValues.confirmPassword
      );
      setFormSuccess("Senha atualizada com sucesso.");
      resetForm();
    } catch (err) {
      const error = err as Error;
      setFormError(error.message || "Não foi possível atualizar a senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja encerrar todas as sessões ativas em outros dispositivos? Você permanecerá conectado neste dispositivo."
    );
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setFormError("");
      setFormSuccess("");
      await api.user.revokeAllSessions();
      setFormSuccess("Todas as sessões foram encerradas com sucesso.");
    } catch (err) {
      const error = err as Error;
      setFormError(error.message || "Não foi possível encerrar as sessões.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja fechar sua conta? Esta ação é permanente."
    );
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      await api.user.deleteAccount();
      window.location.href = "/register";
    } catch (err) {
      const error = err as Error;
      setFormError(error.message || "Não foi possível fechar sua conta.");
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Configurações
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
          Conta, segurança e assinatura
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Controle seus dados, status do plano e preferências do dashboard.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
              Dados da conta
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Atualize e-mail de login e preferências básicas do perfil.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                E-mail de login:{" "}
                <span className="font-semibold text-[var(--color-text-main)]">
                  {user?.email || "usuario@exemplo.com"}
                </span>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                Último acesso:{" "}
                <span className="font-semibold text-[var(--color-text-main)]">
                  Hoje, 14:20
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
              Plano e billing
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Acompanhe status, data de expiração e renove quando necessário.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                Status:{" "}
                <span className="font-semibold text-[var(--color-success)]">
                  Ativo
                </span>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                Expira em:{" "}
                <span className="font-semibold text-[var(--color-text-main)]">
                  30/12/2025
                </span>
              </div>
              <button
                className="w-full rounded-xl border-2 border-[var(--color-primary)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-primary)] transition-all hover:bg-[color:rgba(245,61,45,0.05)]"
                type="button"
              >
                Ver assinatura / renovar
              </button>
            </div>
          </div>
        </div>
        {/* Login History Section */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Histórico de logins
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Monitore os acessos recentes à sua conta para detectar atividades suspeitas.
          </p>

          {historyLoading ? (
            <div className="mt-6 flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]"></div>
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
              Nenhum histórico de login encontrado.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {loginHistory.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-xl border px-4 py-3 ${entry.success
                    ? "border-[var(--color-border)] bg-white"
                    : "border-[var(--color-danger)] bg-[color:rgba(239,68,68,0.05)]"
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {entry.success ? (
                          <svg
                            className="h-5 w-5 text-[var(--color-success)]"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-[var(--color-danger)]"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        <span
                          className={`text-sm font-semibold ${entry.success
                            ? "text-[var(--color-success)]"
                            : "text-[var(--color-danger)]"
                            }`}
                        >
                          {entry.success ? "Login bem-sucedido" : "Falha no login"}
                        </span>
                      </div>
                      {!entry.success && entry.failureReason && (
                        <p className="mt-1 text-xs text-[var(--color-danger)]">
                          {entry.failureReason}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                        <span>{formatDate(entry.loginAt)}</span>
                        {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
                        {entry.deviceInfo && (
                          <>
                            {entry.deviceInfo.browser && (
                              <span>{entry.deviceInfo.browser}</span>
                            )}
                            {entry.deviceInfo.os && <span>{entry.deviceInfo.os}</span>}
                            {entry.deviceInfo.device && (
                              <span>{entry.deviceInfo.device}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
                  Segurança
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Gerencie a senha, sessões e fechamento da conta com segurança.
                </p>
              </div>

            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
              <h3 className="text-base font-semibold text-[var(--color-text-main)]">
                Trocar senha
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Atualize sua senha com segurança seguindo os requisitos abaixo.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
                <div>
                  <Input
                    id="current-password"
                    label="Senha atual"
                    type="password"
                    value={formValues.currentPassword}
                    onChange={handleChange("currentPassword")}
                  />
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                    Requisitos da senha
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li
                      className={
                        passwordRequirements.minLength
                          ? "text-[var(--color-success)]"
                          : "text-[var(--color-text-secondary)]"
                      }
                    >
                      Minimo de 8 caracteres
                    </li>
                    <li
                      className={
                        passwordRequirements.hasUpper
                          ? "text-[var(--color-success)]"
                          : "text-[var(--color-text-secondary)]"
                      }
                    >
                      Uma letra maiuscula
                    </li>
                    <li
                      className={
                        passwordRequirements.hasLower
                          ? "text-[var(--color-success)]"
                          : "text-[var(--color-text-secondary)]"
                      }
                    >
                      Uma letra minuscula
                    </li>
                    <li
                      className={
                        passwordRequirements.hasNumber
                          ? "text-[var(--color-success)]"
                          : "text-[var(--color-text-secondary)]"
                      }
                    >
                      Um numero
                    </li>
                  </ul>
                </div>
                <div>
                  <Input
                    id="new-password"
                    label="Nova senha"
                    type="password"
                    value={formValues.newPassword}
                    onChange={handleChange("newPassword")}
                    error={newPasswordError}
                  />
                </div>

                <div>
                  <Input
                    id="confirm-password"
                    label="Confirmar nova senha"
                    type="password"
                    value={formValues.confirmPassword}
                    onChange={handleChange("confirmPassword")}
                    error={confirmPasswordError}
                  />
                </div>

                {formError && (
                  <div className="rounded-[var(--radius-md)] border-2 border-[var(--color-danger)] bg-[color:rgba(239,68,68,0.1)] px-4 py-3 text-sm font-semibold text-[var(--color-danger)]">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="rounded-[var(--radius-md)] border-2 border-[var(--color-success)] bg-[color:rgba(34,197,94,0.1)] px-4 py-3 text-sm font-semibold text-[var(--color-success)]">
                    {formSuccess}
                  </div>
                )}

                <Button type="submit" loading={loading} className="w-full">
                  Atualizar senha
                </Button>
              </form>

            </div>
            <div className="flex flex-col gap-3 text-sm">
              <button
                className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                type="button"
                onClick={handleRevokeAllSessions}
                disabled={loading}
              >
                {loading ? "Encerrando..." : "Deslogar de todos os dispositivos"}
              </button>
              <button
                className="rounded-xl border-2 border-[var(--color-danger)] bg-white px-4 py-2 font-semibold text-[var(--color-danger)] transition-all hover:bg-[color:rgba(239,68,68,0.08)] disabled:opacity-50"
                type="button"
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                Fechar conta
              </button>
            </div>
          </div>
        </div>
      </div>


    </>
  );
}
