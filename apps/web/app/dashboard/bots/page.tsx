"use client";

import { useEffect, useRef, useState } from "react";

import { BOT_TYPES } from "@/lib/constants";
import { showToast } from "@/lib/toast";

type LinkToken = {
  id: string;
  token: string;
  expiresAt: string;
  status: string;
};

const CONTRACTED_BOTS_COUNT_BY_TYPE = {
  [BOT_TYPES.ARTS]: 2,
  [BOT_TYPES.DOWNLOAD]: 2,
};
const MAX_ART_TOKENS = 2;
const MAX_DOWNLOAD_TOKENS = 2;
const TOKEN_LIST_COMPACT_WIDTH = 430;

export default function BotsPage() {
  const [artTokens, setArtTokens] = useState<LinkToken[]>([]);
  const [downloadTokens, setDownloadTokens] = useState<LinkToken[]>([]);
  const [tokenVisibility, setTokenVisibility] = useState<Record<string, boolean>>({});
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const [refreshingArtTokenId, setRefreshingArtTokenId] = useState<string | null>(null);
  const [refreshingDownloadTokenId, setRefreshingDownloadTokenId] = useState<string | null>(null);
  const [isArtTokenCompact, setIsArtTokenCompact] = useState(false);
  const [isDownloadTokenCompact, setIsDownloadTokenCompact] = useState(false);
  const artTokenContainerRef = useRef<HTMLDivElement | null>(null);
  const downloadTokenContainerRef = useRef<HTMLDivElement | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  const fetchArtTokens = async () => {
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

  const fetchDownloadTokens = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/telegram/link-tokens?botType=${BOT_TYPES.DOWNLOAD}`,
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
        setDownloadTokens(data.tokens);
      }
    } catch (error) {
      console.error("Erro ao carregar tokens:", error);
    }
  };

  useEffect(() => {
    fetchArtTokens();
    fetchDownloadTokens();
  }, [apiBaseUrl]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        setIsArtTokenCompact(entry.contentRect.width < TOKEN_LIST_COMPACT_WIDTH);
      });
    });

    if (artTokenContainerRef.current) {
      observer.observe(artTokenContainerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        setIsDownloadTokenCompact(entry.contentRect.width < TOKEN_LIST_COMPACT_WIDTH);
      });
    });

    if (downloadTokenContainerRef.current) {
      observer.observe(downloadTokenContainerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      showToast("Token copiado com sucesso", "success");
    } catch (error) {
      console.error("Erro ao copiar token:", error);
      showToast("Erro ao copiar token", "error");
    }
  };

  const handleGenerateArtToken = async () => {
    if (artTokens.length >= MAX_ART_TOKENS || isGeneratingArt) return;
    setIsGeneratingArt(true);
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
        await fetchArtTokens();
        await handleCopyToken(data.token);
      }
    } catch (error) {
      console.error("Erro ao gerar token:", error);
      showToast("Erro ao gerar token", "error");
    } finally {
      setIsGeneratingArt(false);
    }
  };

  const handleGenerateDownloadToken = async () => {
    if (downloadTokens.length >= MAX_DOWNLOAD_TOKENS || isGeneratingDownload) return;
    setIsGeneratingDownload(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/link-token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ botType: BOT_TYPES.DOWNLOAD }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data?.error || "Erro ao gerar token", "error");
        return;
      }

      if (data?.token) {
        await fetchDownloadTokens();
        await handleCopyToken(data.token);
      }
    } catch (error) {
      console.error("Erro ao gerar token:", error);
      showToast("Erro ao gerar token", "error");
    } finally {
      setIsGeneratingDownload(false);
    }
  };

  const handleDeleteToken = async (
    tokenId: string,
    setTokens: React.Dispatch<React.SetStateAction<LinkToken[]>>
  ) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/link-tokens/${tokenId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        showToast("Erro ao deletar token", "error");
        return;
      }

      setTokens((prev) => prev.filter((token) => token.id !== tokenId));
      showToast("ID deletado com sucesso", "success");
    } catch (error) {
      console.error("Erro ao deletar token:", error);
      showToast("Erro ao deletar token", "error");
    }
  };

  const handleRefreshArtToken = async (tokenId: string) => {
    if (isGeneratingArt || refreshingArtTokenId) return;
    setRefreshingArtTokenId(tokenId);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/telegram/link-tokens/${tokenId}/refresh?botType=${BOT_TYPES.ARTS}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showToast(data?.error || "Erro ao atualizar token", "error");
        return;
      }

      if (data?.token) {
        await fetchArtTokens();
        await handleCopyToken(data.token);
      }
    } catch (error) {
      console.error("Erro ao atualizar token:", error);
      showToast("Erro ao atualizar token", "error");
    } finally {
      setRefreshingArtTokenId(null);
    }
  };

  const handleRefreshDownloadToken = async (tokenId: string) => {
    if (isGeneratingDownload || refreshingDownloadTokenId) return;
    setRefreshingDownloadTokenId(tokenId);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/telegram/link-tokens/${tokenId}/refresh?botType=${BOT_TYPES.DOWNLOAD}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showToast(data?.error || "Erro ao atualizar token", "error");
        return;
      }

      if (data?.token) {
        await fetchDownloadTokens();
        await handleCopyToken(data.token);
      }
    } catch (error) {
      console.error("Erro ao atualizar token:", error);
      showToast("Erro ao atualizar token", "error");
    } finally {
      setRefreshingDownloadTokenId(null);
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
            botType: BOT_TYPES.ARTS,
          },
          {
            title: "Bot de Download (redes sociais)",
            description:
              "Baixa mídia do Instagram, TikTok, YouTube e Pinterest com 1 link.",
            status: "Disponível no plano",
            accent: "var(--color-info)",
            tokenId: "token-para-liberar-bot-de-download",
            botType: BOT_TYPES.DOWNLOAD,
          },
        ].map((bot) => (
          <div
            key={bot.title}
            className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]"
          >
            {(() => {
              const isArtBot = bot.botType === BOT_TYPES.ARTS;
              const tokens = isArtBot ? artTokens : downloadTokens;
              const isCompact = isArtBot ? isArtTokenCompact : isDownloadTokenCompact;
              const isGenerating = isArtBot ? isGeneratingArt : isGeneratingDownload;
              const refreshingId = isArtBot
                ? refreshingArtTokenId
                : refreshingDownloadTokenId;
              const containerRef = isArtBot
                ? artTokenContainerRef
                : downloadTokenContainerRef;
              const handleRefresh = isArtBot
                ? handleRefreshArtToken
                : handleRefreshDownloadToken;
              const setTokens = isArtBot ? setArtTokens : setDownloadTokens;

              return (
                <>
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
                  <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs text-[var(--color-text-secondary)]">
                    Bots contratados:{" "}
                    <span className="font-semibold text-[var(--color-text-main)]">
                      {CONTRACTED_BOTS_COUNT_BY_TYPE[bot.botType]}
                    </span>
                  </div>
                  <div
                    id={bot.tokenId}
                    ref={containerRef}
                    className="mt-4 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs text-[var(--color-text-secondary)]"
                  >
                    <p>
                      Conecte no Telegram com um token e envie:{" "}
                      <span className="font-semibold text-[var(--color-text-main)]">
                        /start SEU_TOKEN
                      </span>
                    </p>
                    {tokens.length === 0 && (
                      <p>Nenhum token gerado ainda.</p>
                    )}
                    {tokens.map((token, index) => (
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
                                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9a3 3 0 100 6 3 3 0 000-6z"
                              />
                            </svg>
                            {isCompact ? (
                              <span className="sr-only">
                                {tokenVisibility[token.id] ? "Ocultar" : "Ver"}
                              </span>
                            ) : tokenVisibility[token.id] ? (
                              "Ocultar"
                            ) : (
                              "Ver"
                            )}
                          </button>
                          <button
                            onClick={() => handleRefresh(token.id)}
                            className="flex items-center gap-1 rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 text-[10px] font-semibold text-yellow-700 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                            aria-label="Atualizar token"
                            disabled={isGenerating || refreshingId === token.id}
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
                                d="M21 12a9 9 0 11-2.64-6.36"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 3v6h-6"
                              />
                            </svg>
                            {isCompact ? (
                              <span className="sr-only">Atualizar</span>
                            ) : (
                              "Atualizar"
                            )}
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
                                d="M9 9h10v10H9z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5h10v10H5z"
                              />
                            </svg>
                            {isCompact ? <span className="sr-only">Copiar</span> : "Copiar"}
                          </button>
                          <button
                            onClick={() => handleDeleteToken(token.id, setTokens)}
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
                                d="M3 6h18"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 6V4h8v2"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 6l1 14h10l1-14"
                              />
                            </svg>
                            {isCompact ? (
                              <span className="sr-only">Deletar</span>
                            ) : (
                              "Deletar"
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
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
              disabled={
                (item.id === "btn-gerar-token-de-artes" &&
                  (artTokens.length >= MAX_ART_TOKENS || isGeneratingArt)) ||
                (item.id === "btn-gerar-token-de-download" &&
                  (downloadTokens.length >= MAX_DOWNLOAD_TOKENS ||
                    isGeneratingDownload))
              }
              onClick={
                item.id === "btn-gerar-token-de-artes"
                  ? handleGenerateArtToken
                  : handleGenerateDownloadToken
              }
            >
              {item.id === "btn-gerar-token-de-artes" &&
                artTokens.length >= MAX_ART_TOKENS
                ? "Limite de tokens atingido"
                : item.id === "btn-gerar-token-de-download" &&
                  downloadTokens.length >= MAX_DOWNLOAD_TOKENS
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
            id="btn-acessar-bot-de-artes"
          >
            Acessar o bot de Artes
          </a>
          <a
            href="https://t.me/DivulgaFacilDownload_bot"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90"
            id="btn-acessar-bot-de-download"
          >
            Acessar o bot de Download
          </a>
        </div>
      </div>
    </>
  );
}
