"use client";

import { useEffect, useState } from "react";

import { showToast } from "@/lib/toast";
import { BOT_TYPES } from "@/lib/constants";

type LinkToken = {
  id: string;
  token: string;
  expiresAt: string;
  status: string;
};

export default function BotsPage() {
  const [artTokens, setArtTokens] = useState<LinkToken[]>([]);
  const [tokenVisibility, setTokenVisibility] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  const fetchTokens = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/telegram/link-tokens?botType=${BOT_TYPES.ARTS}`,
        {
        method: "GET",
        credentials: "include",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.tokens)) {
        setArtTokens(data.tokens);
      }
    } catch (error) {
      console.error("Erro ao carregar tokens:", error);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [apiBaseUrl]);

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      showToast("Token copiado com sucesso", "success");
    } catch (error) {
      console.error("Erro ao copiar token:", error);
      showToast("Erro ao copiar token", "error");
    }
  };

  const handleGenerateToken = async () => {
    if (artTokens.length >= 2 || isGenerating) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/link-token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ botType: BOT_TYPES.ARTS }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data?.error || "Erro ao gerar token", "error");
        return;
      }

      if (data?.token) {
        if (data?.tokenRecord) {
          setArtTokens((prev) => [...prev, data.tokenRecord]);
        } else {
          await fetchTokens();
        }
        await handleCopyToken(data.token);
      }
    } catch (error) {
      console.error("Erro ao gerar token:", error);
      showToast("Erro ao gerar token", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/link-tokens/${tokenId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        showToast("Erro ao deletar token", "error");
        return;
      }

      setArtTokens((prev) => prev.filter((token) => token.id !== tokenId));
      showToast("ID deletado com sucesso", "success");
    } catch (error) {
      console.error("Erro ao deletar token:", error);
      showToast("Erro ao deletar token", "error");
    }
  };

  const handleToggleVisibility = (tokenId: string) => {
    setTokenVisibility((prev) => ({
      ...prev,
      [tokenId]: !prev[tokenId],
    }));
  };

  return (
    <>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Meus bots
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
          Seus bots e acesso por plano
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Aqui você acompanha quais bots estão liberados e conecta sua conta do
          Telegram para começar a usar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          {
            title: "Bot de Artes (marketplaces)",
            description:
              "Gera artes prontas para feed, story e WhatsApp a partir de links.",
            status: "Disponível no plano",
            accent: "var(--color-primary)",
            tokenId: "token-para-liberar-bot-de-artes",
          },
          {
            title: "Bot de Download (redes sociais)",
            description:
              "Baixa mídia de Instagram, TikTok e Pinterest com 1 link.",
            status: "Disponível no plano",
            accent: "var(--color-info)",
            tokenId: "token-para-liberar-bot-de-downloads",
          },
        ].map((bot) => (
          <div
            key={bot.title}
            className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
                {bot.title}
              </h2>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: bot.accent }}
              >
                {bot.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              {bot.description}
            </p>
            {bot.tokenId === "token-para-liberar-bot-de-artes" ? (
              <div
                id={bot.tokenId}
                className="mt-6 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs text-[var(--color-text-secondary)]"
              >
                <p>
                  Conecte no Telegram com um token temporário e envie:{" "}
                  <span className="font-semibold text-[var(--color-text-main)]">
                    /start SEU_TOKEN
                  </span>
                </p>
                {artTokens.length === 0 && (
                  <p>Nenhum token gerado ainda.</p>
                )}
                {artTokens.map((token, index) => (
                  <div
                    key={token.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-[var(--color-text-main)]">
                        Token {index + 1}
                      </p>
                      <p className="break-all text-[var(--color-text-secondary)]">
                        {tokenVisibility[token.id] ? token.token : "************"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVisibility(token.id)}
                        className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)]"
                        type="button"
                        aria-label="Mostrar ou ocultar token"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {tokenVisibility[token.id] ? "Ocultar" : "Ver"}
                      </button>
                      <button
                        onClick={() => handleCopyToken(token.token)}
                        className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
                        type="button"
                        aria-label="Copiar token"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16h8m-8-4h8m-2-8H8a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2z"
                          />
                        </svg>
                        Copiar
                      </button>
                      <button
                        onClick={() => handleDeleteToken(token.id)}
                        className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600"
                        type="button"
                        aria-label="Deletar token"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4"
                          />
                        </svg>
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                id={bot.tokenId}
                className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs text-[var(--color-text-secondary)]"
              >
                Este bot ficará pronto em breve.
              </div>
            )}
          </div>
        ))}
      </div>

      <div id='conectar-telegram' className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <h2 className="text-xl font-bold text-[var(--color-text-main)]">
          Conectar Telegram
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Gere o token do bot contratado e conecte sua conta para liberar o uso.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            {
              id: "btn-gerar-token-de-artes",
              label: "Gerar token do Bot de Artes",
            },
            {
              id: "btn-gerar-token-de-download",
              label: "Gerar token do Bot de Download",
            },
          ].map((item) => (
            <button
              id={item.id}
              key={item.id}
              className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-left text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              type="button"
              disabled={item.id === "btn-gerar-token-de-artes" && (artTokens.length >= 2 || isGenerating)}
              onClick={
                item.id === "btn-gerar-token-de-artes"
                  ? handleGenerateToken
                  : () => showToast("Este bot ficará pronto em breve", "info")
              }
            >
              {item.id === "btn-gerar-token-de-artes" && artTokens.length >= 2
                ? "Limite de tokens atingido"
                : item.label}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <a
            href="https://t.me/DivulgaFacilArtes_bot"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90"
          >
            Acessar o bot de Artes
          </a>
          <button
            onClick={() => showToast("Este bot ficará pronto em breve", "info")}
            className="rounded-xl border-2 border-[var(--color-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            type="button"
          >
            Acessar o bot de Download
          </button>
        </div>
      </div>
    </>
  );
}
