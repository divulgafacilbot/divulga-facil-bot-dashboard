"use client";

import { Button } from "@/components/forms/Button";
import { Input } from "@/components/forms/Input";
import { api } from "@/lib/api";
import { AuthRoute } from "@/lib/common-enums";
import { resetPasswordSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";

type ResetPasswordForm = {
  newPassword: string;
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError("Link inválido ou expirado.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await api.auth.resetPassword(token, data.newPassword);
      router.push(`${AuthRoute.LOGIN}?reset=success`);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Não foi possível atualizar a senha.");
    } finally{
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:rgba(239,68,68,0.1)] border-2 border-[var(--color-danger)]">
            <svg
              className="h-8 w-8 text-[var(--color-danger)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-danger)]">
            Link inválido
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--color-danger)]">
            Link expirado
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
            O link de redefinição não é válido ou já expirou. Solicite um novo link para continuar.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="group flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-gradient-primary px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-all duration-200 hover:shadow-[var(--shadow-primary-lg)] hover:-translate-y-0.5"
        >
          Solicitar novo link
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

  return (
    <div className="flex flex-col gap-8">
      {/* Header with icon */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero shadow-[var(--shadow-xl)]">
          <Image
            src="/logo.png"
            alt="Posting Bot"
            width={50}
            height={50}
            className="h-9 w-9 object-contain"
          />
        </div>
        <p className="mb-0 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-info)]">
          Definir nova senha
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text-main)]">
          Atualize sua senha
        </h1>
        <p className="mb-0 mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Escolha uma senha forte e segura para proteger sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input
          id="newPassword"
          label="Nova senha"
          type="password"
          placeholder="Mínimo 8 caracteres"
          error={errors.newPassword?.message}
          {...register("newPassword")}
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
          Atualizar senha
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--color-background)] px-2 text-[var(--color-text-secondary)]">
            Senha atualizada?
          </span>
        </div>
      </div>

      <Link
        href="/login"
        className="group flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[color:rgba(245,61,45,0.05)] hover:shadow-[var(--shadow-sm)]"
      >
        <svg
          className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 17l-5-5m0 0l5-5m-5 5h12"
          />
        </svg>
        Voltar para login
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-10">
          <span className="loading" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
