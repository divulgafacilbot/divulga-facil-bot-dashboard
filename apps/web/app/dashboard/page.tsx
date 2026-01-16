"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BOT_TYPES, ROUTES } from "@/lib/constants";

export default function DashboardPage() {
  const [activeArtsBots, setActiveArtsBots] = useState(0);
  const [activeDownloadBots, setActiveDownloadBots] = useState(0);
  const [activePinterestBots, setActivePinterestBots] = useState(0);
  const [activeSuggestionBots, setActiveSuggestionBots] = useState(0);
  const [artsGenerated, setArtsGenerated] = useState(0);
  const [downloadsGenerated, setDownloadsGenerated] = useState(0);
  const [pinterestPins, setPinterestPins] = useState(0);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(0);
  const [publicPageMetrics, setPublicPageMetrics] = useState<any>(null);
  const [publicPageSlug, setPublicPageSlug] = useState<string | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/me/metrics`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setActiveArtsBots(data?.activeBots?.arts || 0);
        setActiveDownloadBots(data?.activeBots?.download || 0);
        setActivePinterestBots(data?.activeBots?.pinterest || 0);
        setActiveSuggestionBots(data?.activeBots?.suggestion || 0);
        setArtsGenerated(data?.usage?.renders || 0);
        setDownloadsGenerated(data?.usage?.downloads || 0);
        setPinterestPins(data?.usage?.pinterestPins || 0);
        setSuggestionsGenerated(data?.usage?.suggestions || 0);
      } catch (error) {
        console.error("Erro ao carregar métricas:", error);
      }
    };

    const loadTokenCounts = async () => {
      try {
        const [artsResponse, downloadResponse, pinterestResponse, suggestionResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/telegram/link-tokens?botType=${BOT_TYPES.PROMOCOES}`, {
            method: "GET",
            credentials: "include",
          }),
          fetch(`${apiBaseUrl}/api/telegram/link-tokens?botType=${BOT_TYPES.DOWNLOAD}`, {
            method: "GET",
            credentials: "include",
          }),
          fetch(`${apiBaseUrl}/api/telegram/link-tokens?botType=${BOT_TYPES.PINTEREST}`, {
            method: "GET",
            credentials: "include",
          }),
          fetch(`${apiBaseUrl}/api/telegram/link-tokens?botType=${BOT_TYPES.SUGGESTION}`, {
            method: "GET",
            credentials: "include",
          }),
        ]);

        if (artsResponse.ok) {
          const data = await artsResponse.json();
          setActiveArtsBots(Array.isArray(data.tokens) ? data.tokens.length : 0);
        }

        if (downloadResponse.ok) {
          const data = await downloadResponse.json();
          setActiveDownloadBots(Array.isArray(data.tokens) ? data.tokens.length : 0);
        }

        if (pinterestResponse.ok) {
          const data = await pinterestResponse.json();
          setActivePinterestBots(Array.isArray(data.tokens) ? data.tokens.length : 0);
        }

        if (suggestionResponse.ok) {
          const data = await suggestionResponse.json();
          setActiveSuggestionBots(Array.isArray(data.tokens) ? data.tokens.length : 0);
        }
      } catch (error) {
        console.error("Erro ao carregar tokens:", error);
      }
    };

    const loadPublicPageMetrics = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/analytics/dashboard?timeRange=30d`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setPublicPageMetrics(data.publicPage || null);
        }
      } catch (error) {
        console.error("Erro ao carregar métricas da página pública:", error);
      }
    };

    const loadPublicPageSlug = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/public-page/settings`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setPublicPageSlug(data.slug || null);
        }
      } catch (error) {
        console.error("Erro ao carregar slug da página pública:", error);
      }
    };

    // Parallel fetch to eliminate waterfall
    Promise.all([
      loadMetrics(),
      loadTokenCounts(),
      loadPublicPageMetrics(),
      loadPublicPageSlug(),
    ]);
  }, [apiBaseUrl]);

  return (
    <>
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-main)]">
          Visão geral
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Acompanhe suas métricas e gerencie seus bots
        </p>
      </div>

      {/* Stats Grid */}
      <div className="flex flex-wrap justify-start gap-4">
        <div className="flex-1 min-w-[250px] max-w-[350px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Bots de Promoções ativos
            </p>
            <div className="rounded-lg bg-[color:rgba(245,61,45,0.1)] p-2">
              <svg
                className="h-5 w-5 text-[var(--color-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7.5 4.5h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9a3 3 0 013-3z"
                />
              </svg>
            </div>
          </div>
          <p id="contador-de-bots-de-artes-ativos" className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            {activeArtsBots}
          </p>
          {activeArtsBots === 0 && (
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Nenhum bot de Promoções configurado ainda
            </p>
          )}
        </div>
        <div className="flex-1 min-w-[300px] max-w-[400px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Bots de download ativos
            </p>
            <div className="rounded-lg bg-[color:rgba(245,61,45,0.1)] p-2">
              <svg
                className="h-5 w-5 text-[var(--color-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7.5 4.5h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9a3 3 0 013-3z"
                />
              </svg>
            </div>
          </div>
          <p id="contador-de-bots-de-download-ativos" className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            {activeDownloadBots}
          </p>
          {activeDownloadBots === 0 && (
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Nenhum bot de download configurado ainda
            </p>
          )}
        </div>

        <div className="flex-1 min-w-[300px] max-w-[400px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Bots de Pinterest ativos
            </p>
            <div className="rounded-lg bg-[color:rgba(230,0,35,0.1)] p-2">
              <svg
                className="h-5 w-5 text-[#E60023]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
            </div>
          </div>
          <p id="contador-de-bots-de-pinterest-ativos" className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            {activePinterestBots}
          </p>
          {activePinterestBots === 0 && (
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Nenhum bot de Pinterest configurado ainda
            </p>
          )}
        </div>

        <div className="flex-1 min-w-[300px] max-w-[400px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Bots de Sugestão ativos
            </p>
            <div className="rounded-lg bg-[color:rgba(168,85,247,0.1)] p-2">
              <svg
                className="h-5 w-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
          </div>
          <p id="contador-de-bots-de-sugestao-ativos" className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            {activeSuggestionBots}
          </p>
          {activeSuggestionBots === 0 && (
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Nenhum bot de sugestão configurado ainda
            </p>
          )}
        </div>


        <div className="flex-1 min-w-[300px] max-w-[400px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Promoções geradas
            </p>
            <div className="rounded-lg bg-[color:rgba(34,197,94,0.1)] p-2">
              <svg
                className="h-5 w-5 text-[var(--color-success)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <p id="contador-de-artes-geradas" className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            {artsGenerated}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Neste mês
          </p>
        </div>


        <div className="flex-1 min-w-[300px] max-w-[400px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Quantidade de downloads
            </p>
            <div className="rounded-lg bg-[color:rgba(34,197,94,0.1)] p-2">
              <svg
                className="h-5 w-5 text-[var(--color-success)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <p id="contador-de-downloads-gerados" className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            {downloadsGenerated}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Neste mês
          </p>
        </div>

        <div className="flex-1 min-w-[300px] max-w-[400px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Pins do Pinterest
            </p>
            <div className="rounded-lg bg-[color:rgba(230,0,35,0.1)] p-2">
              <svg
                className="h-5 w-5 text-[#E60023]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
            </div>
          </div>
          <p id="contador-de-pins-do-pinterest" className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            {pinterestPins}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Neste mês
          </p>
        </div>

        <div className="flex-1 min-w-[300px] max-w-[400px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Sugestões geradas
            </p>
            <div className="rounded-lg bg-[color:rgba(168,85,247,0.1)] p-2">
              <svg
                className="h-5 w-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
          </div>
          <p id="contador-de-sugestoes-geradas" className="mt-4 text-3xl font-bold text-[var(--color-text-main)]">
            {suggestionsGenerated}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Neste mês
          </p>
        </div>

        {publicPageMetrics && (
          <div className="flex-1 min-w-[300px] max-w-[400px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Página Pública
              </p>
              <div className="rounded-lg bg-[color:rgba(147,51,234,0.1)] p-2">
                <svg
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-[var(--color-text-secondary)]">Visualizações</span>
                <span className="text-2xl font-bold text-[var(--color-text-main)]">{publicPageMetrics.profileViews || 0}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-[var(--color-text-secondary)]">Cliques</span>
                <span className="text-2xl font-bold text-[var(--color-text-main)]">{publicPageMetrics.cardClicks || 0}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-[var(--color-text-secondary)]">CTR</span>
                <span className="text-xl font-bold text-green-600">{publicPageMetrics.ctr || 0}%</span>
              </div>
            </div>
            <Link href={ROUTES.dashboard.publicPage} className="mt-3 block text-center text-sm text-[var(--color-primary)] hover:underline">
              Gerenciar página →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-md)]">
        <h2 className="text-xl font-bold text-[var(--color-text-main)]">
          Primeiros passos
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Configure sua conta para começar a usar o bot
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href={ROUTES.dashboard.bots}
            className="group rounded-xl border-2 border-[var(--color-border)] bg-white p-6 transition-all hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-[color:rgba(245,61,45,0.1)] p-3 group-hover:bg-[var(--color-primary)] transition-colors">
                <svg
                  className="h-6 w-6 text-[var(--color-primary)] group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-primary)] transition-colors">
                  Criar primeiro bot
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Configure um bot para começar a publicar
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={ROUTES.dashboard.templates}
            className="group rounded-xl border-2 border-[var(--color-border)] bg-white p-6 transition-all hover:border-[var(--color-secondary)] hover:shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-[color:rgba(45,106,239,0.1)] p-3 group-hover:bg-[var(--color-secondary)] transition-colors">
                <svg
                  className="h-6 w-6 text-[var(--color-secondary)] group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7.5 3.75h6l4.5 4.5v11.25M8.25 12h7.5"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-secondary)] transition-colors">
                  Personalizar templates
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Ajuste os templates de publicação
                </p>
              </div>
            </div>
          </Link>

          {publicPageSlug && (
            <a
              id="visitar-pagina-publica"
              href={`${process.env.NEXT_PUBLIC_WEB_URL || ''}/${publicPageSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border-2 border-[var(--color-border)] bg-white p-6 transition-all hover:border-purple-500 hover:shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-[color:rgba(147,51,234,0.1)] p-3 group-hover:bg-purple-500 transition-colors">
                  <svg
                    className="h-6 w-6 text-purple-500 group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--color-text-main)] group-hover:text-purple-500 transition-colors">
                    Visitar página pública
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Veja como os visitantes veem sua página
                  </p>
                </div>
              </div>
            </a>
          )}
        </div>
      </div>
    </>
  );
}
