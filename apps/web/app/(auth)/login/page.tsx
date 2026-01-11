"use client";

import { Button } from "@/components/forms/Button";
import { Input } from "@/components/forms/Input";
import { api } from "@/lib/api";
import { DashboardRoute } from "@/lib/common-enums";
import { ROUTES } from "@/lib/constants";
import { loginSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";

type LoginForm = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Show success message if coming from registration
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Conta criada com sucesso! Faça login para continuar.");
      // Clean URL without refreshing
      window.history.replaceState({}, "", ROUTES.auth.login);
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError("");
      setSuccessMessage("");
      setLoading(true);

      await api.auth.login(data.email, data.password, data.rememberMe ?? false);
      window.location.href = DashboardRoute.HOME;
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Email ou senha incorretos.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header with icon */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden">
          <Image
            src="/logo.gif"
            alt="Posting Bot"
            width={60}
            height={60}
            className="h-full w-full object-cover object-center"
          />
        </div>
        <p className="mb-0 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)]">
          Acesso ao painel
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text-main)]">
          Vamos configurar seus templates
        </h1>
        <p className="mb-0 mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
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
            <label htmlFor="rememberMe" className="flex items-center gap-2 cursor-pointer">
              <input
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
                {...register("rememberMe")}
              />
              <span className="text-xs text-[var(--color-text-secondary)]">
                Lembrar de mim (60 dias)
              </span>
            </label>
            <Link
              href={ROUTES.auth.forgotPassword}
              className="text-xs font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        {successMessage && (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[color:rgba(34,197,94,0.1)] border-2 border-[var(--color-success)] px-4 py-3 text-sm animate-[slideDown_0.2s_ease-out]">
            <svg
              className="h-5 w-5 flex-shrink-0 text-[var(--color-success)]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-[var(--color-success)]">{successMessage}</span>
          </div>
        )}

        {error && (
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
        href={ROUTES.auth.register}
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Carregando...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
