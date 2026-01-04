"use client";

import { Button } from "@/components/forms/Button";
import { api } from "@/lib/api";
import { ComponentStatus, AuthRoute } from "@/lib/common-enums";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<ComponentStatus>(ComponentStatus.LOADING);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus(ComponentStatus.ERROR);
        setMessage("Token de verificação não encontrado.");
        return;
      }

      try {
        await api.auth.verifyEmail(token);
        setStatus(ComponentStatus.SUCCESS);
        setMessage("E-mail verificado com sucesso!");

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push(AuthRoute.LOGIN);
        }, 3000);
      } catch (err) {
        const error = err as Error;
        setStatus(ComponentStatus.ERROR);
        setMessage(error.message || "Token inválido ou expirado.");
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-lg)] text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden">
              <Image
                src="/logo.gif"
                alt="Posting Bot"
                width={50}
                height={50}
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>

          {status === ComponentStatus.LOADING && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]"></div>
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
                Verificando e-mail...
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Aguarde um momento
              </p>
            </>
          )}

          {status === ComponentStatus.SUCCESS && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)]">
                  <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-success)]">
                E-mail verificado!
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Sua conta foi ativada com sucesso.
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">
                Redirecionando para o login...
              </p>
            </>
          )}

          {status === ComponentStatus.ERROR && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-danger)]">
                  <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-danger)]">
                Erro na verificação
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {message}
              </p>
              <div className="mt-6">
                <Link href="/login">
                  <Button variant="primary">Voltar ao login</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
