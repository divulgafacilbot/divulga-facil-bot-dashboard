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

type PromoToken = {
  id: string;
  botType: string;
  name: string;
  token: string;
  expiresAt?: string;
  isActive: boolean;
};

const CONTRACTED_BOTS_COUNT_BY_TYPE: Record<string, number> = {
  [BOT_TYPES.ARTS]: 2,
  [BOT_TYPES.DOWNLOAD]: 2,
  [BOT_TYPES.PINTEREST]: 2,
  [BOT_TYPES.SUGGESTION]: 2,
};
const MAX_TOKENS_PER_BOT = 2;
const TOKEN_LIST_COMPACT_WIDTH = 430;

export default function BotsPage() {
  const [tokensByBot, setTokensByBot] = useState<Record<string, LinkToken[]>>({
    [BOT_TYPES.ARTS]: [],
    [BOT_TYPES.DOWNLOAD]: [],
    [BOT_TYPES.PINTEREST]: [],
    [BOT_TYPES.SUGGESTION]: [],
  });
  const [promoTokensByBot, setPromoTokensByBot] = useState<Record<string, PromoToken[]>>({
    [BOT_TYPES.ARTS]: [],
    [BOT_TYPES.DOWNLOAD]: [],
    [BOT_TYPES.PINTEREST]: [],
    [BOT_TYPES.SUGGESTION]: [],
  });
  const [tokenVisibility, setTokenVisibility] = useState<Record<string, boolean>>({});
  const [promoTokenVisibility, setPromoTokenVisibility] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const [refreshingTokenId, setRefreshingTokenId] = useState<Record<string, string | null>>({});
  const [refreshingPromoTokenId, setRefreshingPromoTokenId] = useState<Record<string, string | null>>({});
  const [isCompact, setIsCompact] = useState<Record<string, boolean>>({});
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  const fetchTokens = async (botType: string) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/telegram/link-tokens?botType=${botType}`,
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
        setTokensByBot(prev => ({ ...prev, [botType]: data.tokens }));
      }
    } catch (error) {
      console.error("Erro ao carregar tokens:", error);
    }
  };

  const fetchPromoTokens = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/promo-tokens`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        // Group by bot type
        const grouped: Record<string, PromoToken[]> = {
          [BOT_TYPES.ARTS]: [],
          [BOT_TYPES.DOWNLOAD]: [],
          [BOT_TYPES.PINTEREST]: [],
          [BOT_TYPES.SUGGESTION]: [],
        };
        data.data.forEach((token: PromoToken) => {
          if (grouped[token.botType]) {
            grouped[token.botType].push(token);
          }
        });
        setPromoTokensByBot(grouped);
      }
    } catch (error) {
      console.error("Erro ao carregar tokens promocionais:", error);
    }
  };

  useEffect(() => {
    Object.values(BOT_TYPES).forEach(botType => {
      fetchTokens(botType);
    });
    fetchPromoTokens();
  }, [apiBaseUrl]);

  useEffect(() => {
    const observers: ResizeObserver[] = [];

    Object.values(BOT_TYPES).forEach(botType => {
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          setIsCompact(prev => ({ ...prev, [botType]: entry.contentRect.width < TOKEN_LIST_COMPACT_WIDTH }));
        });
      });

      const ref = containerRefs.current[botType];
      if (ref) {
        observer.observe(ref);
        observers.push(observer);
      }
    });

    return () => observers.forEach(obs => obs.disconnect());
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

  const handleGenerateToken = async (botType: string) => {
    const tokens = tokensByBot[botType] || [];
    if (tokens.length >= MAX_TOKENS_PER_BOT || isGenerating[botType]) return;

    setIsGenerating(prev => ({ ...prev, [botType]: true }));
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/link-token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ botType }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data?.error || "Erro ao gerar token", "error");
        return;
      }

      if (data?.token) {
        await fetchTokens(botType);
        await handleCopyToken(data.token);
      }
    } catch (error) {
      console.error("Erro ao gerar token:", error);
      showToast("Erro ao gerar token", "error");
    } finally {
      setIsGenerating(prev => ({ ...prev, [botType]: false }));
    }
  };

  const handleDeleteToken = async (tokenId: string, botType: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/link-tokens/${tokenId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        showToast("Erro ao deletar token", "error");
        return;
      }

      setTokensByBot(prev => ({
        ...prev,
        [botType]: prev[botType].filter((token) => token.id !== tokenId)
      }));
      showToast("Token deletado com sucesso", "success");
    } catch (error) {
      console.error("Erro ao deletar token:", error);
      showToast("Erro ao deletar token", "error");
    }
  };

  const handleRefreshToken = async (tokenId: string, botType: string) => {
    if (isGenerating[botType] || refreshingTokenId[botType]) return;

    setRefreshingTokenId(prev => ({ ...prev, [botType]: tokenId }));
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/telegram/link-tokens/${tokenId}/refresh?botType=${botType}`,
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
        await fetchTokens(botType);
        await handleCopyToken(data.token);
      }
    } catch (error) {
      console.error("Erro ao atualizar token:", error);
      showToast("Erro ao atualizar token", "error");
    } finally {
      setRefreshingTokenId(prev => ({ ...prev, [botType]: null }));
    }
  };

  // Promo token handlers
  const handleDeletePromoToken = async (tokenId: string, botType: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/promo-tokens/${tokenId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        showToast("Erro ao deletar token promocional", "error");
        return;
      }

      setPromoTokensByBot(prev => ({
        ...prev,
        [botType]: prev[botType].filter((token) => token.id !== tokenId)
      }));
      showToast("Token promocional deletado com sucesso", "success");
    } catch (error) {
      console.error("Erro ao deletar token promocional:", error);
      showToast("Erro ao deletar token promocional", "error");
    }
  };

  const handleRefreshPromoToken = async (tokenId: string, botType: string) => {
    if (refreshingPromoTokenId[botType]) return;

    setRefreshingPromoTokenId(prev => ({ ...prev, [botType]: tokenId }));
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/telegram/promo-tokens/${tokenId}/refresh`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showToast(data?.error || "Erro ao atualizar token promocional", "error");
        return;
      }

      if (data?.data?.token) {
        await fetchPromoTokens();
        await handleCopyToken(data.data.token);
      }
    } catch (error) {
      console.error("Erro ao atualizar token promocional:", error);
      showToast("Erro ao atualizar token promocional", "error");
    } finally {
      setRefreshingPromoTokenId(prev => ({ ...prev, [botType]: null }));
    }
  };

  const handleToggleVisibility = (tokenId: string) => {
    setTokenVisibility((prev) => ({
      ...prev,
      [tokenId]: !prev[tokenId],
    }));
  };

  const handleTogglePromoVisibility = (tokenId: string) => {
    setPromoTokenVisibility((prev) => ({
      ...prev,
      [tokenId]: !prev[tokenId],
    }));
  };

  // Token action buttons component
  const TokenActionButtons = ({
    onToggleVisibility,
    onRefresh,
    onCopy,
    onDelete,
    isVisible,
    isRefreshing,
    isCompact,
    token,
  }: {
    onToggleVisibility: () => void;
    onRefresh: () => void;
    onCopy: () => void;
    onDelete: () => void;
    isVisible: boolean;
    isRefreshing: boolean;
    isCompact: boolean;
    token: string;
  }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleVisibility}
        className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)]"
        type="button"
        aria-label="Mostrar ou ocultar token"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9a3 3 0 100 6 3 3 0 000-6z" />
        </svg>
        {isCompact ? <span className="sr-only">{isVisible ? "Ocultar" : "Ver"}</span> : isVisible ? "Ocultar" : "Ver"}
      </button>
      <button
        onClick={onRefresh}
        className="flex items-center gap-1 rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 text-[10px] font-semibold text-yellow-700 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        aria-label="Atualizar token"
        disabled={isRefreshing}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-2.64-6.36" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3v6h-6" />
        </svg>
        {isCompact ? <span className="sr-only">Atualizar</span> : "Atualizar"}
      </button>
      <button
        onClick={onCopy}
        className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
        type="button"
        aria-label="Copiar token"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h10v10H9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5h10v10H5z" />
        </svg>
        {isCompact ? <span className="sr-only">Copiar</span> : "Copiar"}
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600"
        type="button"
        aria-label="Deletar token"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6V4h8v2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l1 14h10l1-14" />
        </svg>
        {isCompact ? <span className="sr-only">Deletar</span> : "Deletar"}
      </button>
    </div>
  );

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
            title: "Bot de Promoções (marketplaces)",
            description:
              "Gera artes promocionais prontas para feed, story e WhatsApp a partir de links.",
            status: "Disponível no plano",
            accent: "var(--color-primary)",
            tokenId: "token-para-liberar-bot-de-artes",
            promoTokenId: "token-promocional-bot-de-artes",
            botType: BOT_TYPES.ARTS,
            generateBtnId: "btn-gerar-token-de-artes",
            generateBtnLabel: "Gerar token do Bot de Promoções",
          },
          {
            title: "Bot de Download (redes sociais)",
            description:
              "Baixa mídia do Instagram, TikTok, YouTube e Pinterest com 1 link.",
            status: "Disponível no plano",
            accent: "var(--color-info)",
            tokenId: "token-para-liberar-bot-de-download",
            promoTokenId: "token-promocional-bot-de-download",
            botType: BOT_TYPES.DOWNLOAD,
            generateBtnId: "btn-gerar-token-de-download",
            generateBtnLabel: "Gerar token do Bot de Download",
          },
          {
            title: "Bot de Pins",
            description:
              "Cria cards automáticos para sua página pública a partir de pins do Pinterest.",
            status: "Disponível no plano",
            accent: "#E60023",
            tokenId: "token-para-liberar-bot-de-pinterest",
            promoTokenId: "token-promocional-bot-de-pinterest",
            botType: BOT_TYPES.PINTEREST,
            generateBtnId: "btn-gerar-token-de-pinterest",
            generateBtnLabel: "Gerar token do Bot de Pins",
          },
          {
            title: "Bot de Sugestões",
            description:
              "Recebe sugestões personalizadas de produtos baseadas nas suas preferências.",
            status: "Disponível no plano",
            accent: "#9333EA",
            tokenId: "token-para-liberar-bot-de-sugestao",
            promoTokenId: "token-promocional-bot-de-sugestao",
            botType: BOT_TYPES.SUGGESTION,
            generateBtnId: "btn-gerar-token-de-sugestao",
            generateBtnLabel: "Gerar token do Bot de Sugestões",
          },
        ].map((bot) => {
          const tokens = tokensByBot[bot.botType] || [];
          const promoTokens = promoTokensByBot[bot.botType] || [];
          const botIsCompact = isCompact[bot.botType] || false;
          const botIsGenerating = isGenerating[bot.botType] || false;
          const botRefreshingId = refreshingTokenId[bot.botType] || null;
          const botPromoRefreshingId = refreshingPromoTokenId[bot.botType] || null;
          const isLimitReached = tokens.length >= MAX_TOKENS_PER_BOT;

          return (
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
              <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs text-[var(--color-text-secondary)]">
                Bots contratados:{" "}
                <span className="font-semibold text-[var(--color-text-main)]">
                  {CONTRACTED_BOTS_COUNT_BY_TYPE[bot.botType]}
                </span>
              </div>

              {/* Generate Token Button - Moved inside bot card */}
              <button
                id={bot.generateBtnId}
                className="mt-4 w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                disabled={isLimitReached || botIsGenerating}
                onClick={() => handleGenerateToken(bot.botType)}
              >
                {botIsGenerating ? "Gerando..." : isLimitReached ? "Limite de tokens atingido" : bot.generateBtnLabel}
              </button>

              {/* Regular Tokens Section */}
              <div
                id={bot.tokenId}
                ref={(el) => { containerRefs.current[bot.botType] = el; }}
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
                    <TokenActionButtons
                      onToggleVisibility={() => handleToggleVisibility(token.id)}
                      onRefresh={() => handleRefreshToken(token.id, bot.botType)}
                      onCopy={() => handleCopyToken(token.token)}
                      onDelete={() => handleDeleteToken(token.id, bot.botType)}
                      isVisible={!!tokenVisibility[token.id]}
                      isRefreshing={botIsGenerating || botRefreshingId === token.id}
                      isCompact={botIsCompact}
                      token={token.token}
                    />
                  </div>
                ))}
              </div>

              {/* Promotional Tokens Section - Hidden until user has promo tokens */}
              {promoTokens.length > 0 && (
                <div
                  id={bot.promoTokenId}
                  className="mt-4 space-y-3 rounded-xl border border-purple-200 bg-purple-50 p-4 text-xs text-[var(--color-text-secondary)]"
                >
                  <p className="font-semibold text-purple-700">
                    Token promocional
                  </p>
                  {promoTokens.slice(0, 1).map((promoToken) => (
                    <div
                      key={promoToken.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-200 bg-white px-3 py-2"
                    >
                      <p className="break-all text-[var(--color-text-secondary)] mb-0 pt-1">
                        {promoTokenVisibility[promoToken.id] ? promoToken.token : "************"}
                      </p>
                      <TokenActionButtons
                        onToggleVisibility={() => handleTogglePromoVisibility(promoToken.id)}
                        onRefresh={() => handleRefreshPromoToken(promoToken.id, bot.botType)}
                        onCopy={() => handleCopyToken(promoToken.token)}
                        onDelete={() => handleDeletePromoToken(promoToken.id, bot.botType)}
                        isVisible={!!promoTokenVisibility[promoToken.id]}
                        isRefreshing={botPromoRefreshingId === promoToken.id}
                        isCompact={botIsCompact}
                        token={promoToken.token}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div id='conectar-telegram' className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <h2 className="text-xl font-bold text-[var(--color-text-main)]">
          Conectar Telegram
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Acesse os bots no Telegram para conectar sua conta e começar a usar.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { id: "btn-acessar-bot-de-artes", label: "Acessar o bot de Promoções", url: "https://t.me/DivulgaFacilArtes_bot" },
            { id: "btn-acessar-bot-de-download", label: "Acessar o bot de Download", url: "https://t.me/DivulgaFacilDownload_bot" },
            { id: "btn-acessar-bot-de-pinterest", label: "Acessar o bot de Pins", url: "https://t.me/DivulgaFacilPinterest_bot" },
            { id: "btn-acessar-bot-de-sugestao", label: "Acessar o bot de Sugestões", url: "https://t.me/DivulgaFacilSugestion_bot" },
          ].map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90"
              id={item.id}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
