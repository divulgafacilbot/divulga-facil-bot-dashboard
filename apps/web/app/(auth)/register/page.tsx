"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { registerSchema } from "@/lib/validation";
import { api } from "@/lib/api";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/forms/Button";

type RegisterForm = {
  email: string;
  password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // Countdown timer for resend email
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [success, countdown]);

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError("");
      setLoading(true);
      await api.auth.register(data.email, data.password);
      setRegisteredEmail(data.email);
      setSuccess(true);
      setCountdown(60); // Reset countdown
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Não foi possível criar sua conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      setResending(true);
      setResendMessage("");
      await api.auth.resendVerification(registeredEmail);
      setResendMessage("E-mail reenviado com sucesso!");
      setCountdown(60); // Reset countdown
    } catch (err) {
      const error = err as Error;
      setResendMessage(error.message || "Erro ao reenviar e-mail. Tente novamente.");
    } finally {
      setResending(false);
    }
  };

  // Show success message if registration succeeded
  if (success) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)] animate-[slideDown_0.3s_ease-out]">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-success)]">
            Conta criada com sucesso!
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Enviamos um link de verificação para <strong className="text-[var(--color-text-main)]">{registeredEmail}</strong>
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Verifique sua caixa de entrada (e também o spam) para ativar sua conta.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border-2 border-[var(--color-success)] bg-[color:rgba(34,197,94,0.05)] p-6">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 flex-shrink-0 text-[var(--color-success)]" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-[var(--color-text-secondary)]">
              <p className="font-semibold text-[var(--color-text-main)]">O que fazer agora?</p>
              <ol className="mt-2 list-decimal list-inside space-y-1">
                <li>Abra seu e-mail</li>
                <li>Clique no link de verificação</li>
                <li>Faça login com suas credenciais</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Resend email section */}
        <div className="text-center text-sm text-[var(--color-text-secondary)]">
          <p className="mb-2">Não recebeu o e-mail?</p>
          {countdown > 0 ? (
            <p className="text-[var(--color-text-secondary)]">
              Enviar novamente em <span className="font-bold text-[var(--color-primary)]">{countdown}</span> segundos
            </p>
          ) : (
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? "Enviando..." : "Clique aqui para reenviar"}
            </button>
          )}
          {resendMessage && (
            <p className={`mt-2 text-sm ${resendMessage.includes("sucesso") ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
              {resendMessage}
            </p>
          )}
        </div>

        <Link href="/login">
          <Button variant="ghost" className="w-full">
            Ir para o login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header with icon */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-[var(--shadow-primary-lg)]">
          <Image
            src="/logo-v2.png"
            alt="Posting Bot"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Criar conta
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text-main)]">
          Comece a personalizar
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Cadastre seu e-mail e defina uma senha para configurar seus templates.
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

        <Input
          id="password"
          label="Senha"
          type="password"
          placeholder="Mínimo 8 caracteres"
          error={errors.password?.message}
          {...register("password")}
        />

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
          Criar conta
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--color-background)] px-2 text-[var(--color-text-secondary)]">
            Já tem conta?
          </span>
        </div>
      </div>

      <Link
        href="/login"
        className="group flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[color:rgba(245,61,45,0.05)] hover:shadow-[var(--shadow-sm)]"
      >
        Entrar na minha conta
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
