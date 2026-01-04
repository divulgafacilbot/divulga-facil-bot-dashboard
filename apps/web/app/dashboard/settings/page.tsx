"use client";

import { Button } from "@/components/forms/Button";
import { api } from "@/lib/api";
import type { User } from "@/types";
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await api.user.getMe();
        setUser(userData);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setUserLoading(false);
      }
    };

    loadData();
  }, []);


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

  const PasswordField = ({
    id,
    label,
    value,
    onChange,
    error,
    isVisible,
    onToggle,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    isVisible: boolean;
    onToggle: () => void;
  }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="flex flex-col gap-2">
        <label
          htmlFor={id}
          className={`text-sm font-semibold transition-colors duration-200 ${
            isFocused
              ? "text-[var(--color-primary)]"
              : error
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-text-main)]"
          }`}
        >
          {label}
        </label>
        <div className="relative">
          <input
            id={id}
            type={isVisible ? "text" : "password"}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full rounded-[var(--radius-md)] border-2 bg-white px-4 py-3 pr-12 text-sm text-[var(--color-text-main)] transition-all duration-200 placeholder:text-[var(--color-text-secondary)] focus:outline-none ${
              error
                ? "border-[var(--color-danger)] shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
                : isFocused
                ? "border-[var(--color-primary)] shadow-[var(--shadow-md)]"
                : "border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:border-[color:rgba(245,61,45,0.3)]"
            }`}
          />
          <button
            type="button"
            onClick={onToggle}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
            aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={isVisible}
          >
            {isVisible ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3l18 18M10.477 10.48a3 3 0 104.243 4.243M9.88 5.09A10.94 10.94 0 0112 5c5.523 0 10 4.477 10 10 0 1.178-.203 2.31-.576 3.36M6.228 6.228C4.242 7.85 3 9.85 3 12c0 5.523 4.477 10 10 10 2.15 0 4.15-.242 5.772-1.228"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-1 animate-[slideDown_0.2s_ease-out]">
            <svg
              className="h-4 w-4 flex-shrink-0 text-[var(--color-danger)]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-[var(--color-danger)]">{error}</span>
          </div>
        )}
      </div>
    );
  };

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
                <PasswordField
                  id="current-password"
                  label="Senha atual"
                  value={formValues.currentPassword}
                  onChange={handleChange("currentPassword")}
                  isVisible={showCurrentPassword}
                  onToggle={() => setShowCurrentPassword((prev) => !prev)}
                />
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
                <PasswordField
                  id="new-password"
                  label="Nova senha"
                  value={formValues.newPassword}
                  onChange={handleChange("newPassword")}
                  error={newPasswordError}
                  isVisible={showNewPassword}
                  onToggle={() => setShowNewPassword((prev) => !prev)}
                />

                <PasswordField
                  id="confirm-password"
                  label="Confirmar nova senha"
                  value={formValues.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  error={confirmPasswordError}
                  isVisible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((prev) => !prev)}
                />

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
