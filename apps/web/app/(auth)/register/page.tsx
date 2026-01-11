"use client";

import { Button } from "@/components/forms/Button";
import { Input } from "@/components/forms/Input";
import { api } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import { registerSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type RegisterForm = {
  email: string;
  password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError("");
      setLoading(true);
      await api.auth.register(data.email, data.password);
      // Redirect to login with success message
      router.push(`${ROUTES.auth.login}?registered=true`);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Não foi possível criar sua conta. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header with icon */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[var(--shadow-primary-lg)] overflow-hidden">
          <Image
            src="/logo.gif"
            alt="Posting Bot"
            width={36}
            height={36}
            className="h-full w-full object-cover object-center"
          />
        </div>
        <p className="mb-0 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Criar conta
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text-main)]">
          Comece a personalizar
        </h1>
        <p className="mb-0 mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
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
        href={ROUTES.auth.login}
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
