"use client";

import { Button } from "@/components/forms/Button";
import { Input } from "@/components/forms/Input";
import { api, IS_PRODUCTION } from "@/lib/api";
import { ApiErrorCode, DashboardRoute } from "@/lib/common-enums";
import { loginSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type LoginForm = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    // PRODUCTION MODE: No validation, DEVELOPMENT MODE: Use Zod validation
    resolver: IS_PRODUCTION ? undefined : zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    // PRODUCTION MODE: Redirect directly to dashboard
    if (IS_PRODUCTION) {
      console.log('🏭 PRODUCTION: Redirecting directly to dashboard');
      window.location.href = DashboardRoute.HOME;
      return;
    }

    // DEVELOPMENT MODE: Normal login flow
    try {
      setError("");
      setLoading(true);
      setShowResendButton(false);

      await api.auth.login(data.email, data.password, data.rememberMe ?? false);
      window.location.href = DashboardRoute.HOME;
    } catch (err) {
      const error = err as Error & { code?: string };

      if (error.message?.toLowerCase().includes('não verificado') || error.code === ApiErrorCode.EMAIL_NOT_VERIFIED) {
        setShowResendButton(true);
        setError('E-mail não verificado. Verifique sua caixa de entrada ou solicite um novo link.');
      } else {
        setError(error.message || "Email ou senha incorretos.");
      }
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = watch("email");
    if (!email) return;

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

  return (
    <div className="flex flex-col gap-8">
      {/* Header with icon */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-secondary shadow-[var(--shadow-lg)]">
          <Image
            src="/logo-v2.png"
            alt="Posting Bot"
            width={50}
            height={50}
            className="h-9 w-9 object-contain"
          />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)]">
          Acesso ao painel
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text-main)]">
          Vamos configurar seus templates
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Entre com seu e-mail e senha para personalizar suas artes e publicar.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input
          id="email"
          label="E-mail"
          type="email"
          placeholder="você@email.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-2">
          <Input
            id="password"
            label="Senha"
            type="password"
            placeholder="Sua senha"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
                {...register("rememberMe")}
              />
              <span className="text-xs text-[var(--color-text-secondary)]">
                Lembrar de mim (60 dias)
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        {error && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[color:rgba(239,68,68,0.1)] border-2 border-[var(--color-danger)] px-4 py-3 text-sm animate-[slideDown_0.2s_ease-out]">
              <svg
                className="h-5 w-5 flex-shrink-0 text-[var(--color-danger)]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium text-[var(--color-danger)]">{error}</span>
            </div>

            {showResendButton && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="w-full rounded-[var(--radius-md)] border-2 border-[var(--color-warning)] bg-[color:rgba(245,158,11,0.1)] px-4 py-2 text-sm font-semibold text-[var(--color-warning)] transition-all hover:bg-[color:rgba(245,158,11,0.2)] disabled:opacity-50"
              >
                {resendLoading ? "Enviando..." : "Reenviar link de verificação"}
              </button>
            )}

            {resendSuccess && (
              <div className="rounded-[var(--radius-md)] border-2 border-[var(--color-success)] bg-[color:rgba(34,197,94,0.1)] px-4 py-2 text-sm font-semibold text-[var(--color-success)]">
                Link de verificação reenviado! Verifique seu e-mail.
              </div>
            )}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full mt-2">
          Entrar
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--color-background)] px-2 text-[var(--color-text-secondary)]">
            Não tem conta?
          </span>
        </div>
      </div>

      <Link
        href="/register"
        className="group flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[color:rgba(245,61,45,0.05)] hover:shadow-[var(--shadow-sm)]"
      >
        Criar uma conta
        <svg
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </Link>
    </div>
  );
}
