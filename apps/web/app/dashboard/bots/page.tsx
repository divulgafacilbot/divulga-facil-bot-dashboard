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

interface MarketplaceOption {
  value: string;
  label: string;
  selected: boolean;
}

interface MarketplaceSummary {
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
  selectedMarketplaces: string[];
  selectedMarketplacesWithNames: Array<{ value: string; label: string }>;
  availableMarketplaces: MarketplaceOption[];
}

interface Entitlements {
  marketplaceCount: number;
  botAccess: Array<{
    botType: string;
    type: string;
    source: string;
    expiresAt: string | null;
  }>;
  subscription: {
    status: string;
    expiresAt: string | null;
    graceUntil: string | null;
    plan: {
      name: string;
      includedMarketplaces: number;
    } | null;
  } | null;
}

const MAX_TOKENS_PER_BOT = 2;
const TOKEN_LIST_COMPACT_WIDTH = 430;

export default function BotsPage() {
  const [tokensByBot, setTokensByBot] = useState<Record<string, LinkToken[]>>({
    [BOT_TYPES.PROMOCOES]: [],
    [BOT_TYPES.DOWNLOAD]: [],
    [BOT_TYPES.PINTEREST]: [],
    [BOT_TYPES.SUGGESTION]: [],
  });
  const [promoTokensByBot, setPromoTokensByBot] = useState<Record<string, PromoToken[]>>({
    [BOT_TYPES.PROMOCOES]: [],
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

  // Marketplace and entitlements state
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [marketplaceSummary, setMarketplaceSummary] = useState<MarketplaceSummary | null>(null);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [savingMarketplaces, setSavingMarketplaces] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [marketplaceSuccess, setMarketplaceSuccess] = useState<string | null>(null);
  const [showMarketplaceConfig, setShowMarketplaceConfig] = useState(false);

  // Bot access control state
  const [botAccess, setBotAccess] = useState<Record<string, boolean>>({});

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
          [BOT_TYPES.PROMOCOES]: [],
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

  const fetchEntitlements = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/user/entitlements`, {
        credentials: 'include'
      });
      const data = await res.json();
      setEntitlements(data);
    } catch (error) {
      console.error('Error fetching entitlements:', error);
    }
  };

  const fetchMarketplaceSummary = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/user/marketplaces`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setMarketplaceSummary(data.data);
        setSelectedMarketplaces(data.data.selectedMarketplaces);
        if (data.data.totalSlots > 0 && data.data.usedSlots === 0) {
          setShowMarketplaceConfig(true);
        }
      }
    } catch (error) {
      console.error('Error fetching marketplace summary:', error);
    }
  };

  const fetchBotAccess = async () => {
    const accessMap: Record<string, boolean> = {};
    for (const botType of Object.values(BOT_TYPES)) {
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/user/entitlements/access/${botType}`,
          { credentials: 'include' }
        );
        const data = await res.json();
        accessMap[botType] = data.hasAccess;
      } catch (error) {
        accessMap[botType] = false;
      }
    }
    setBotAccess(accessMap);
  };

  const handleToggleMarketplace = (value: string) => {
    if (!marketplaceSummary) return;
    setSelectedMarketplaces((prev) => {
      if (prev.includes(value)) {
        return prev.filter((m) => m !== value);
      } else {
        if (prev.length < marketplaceSummary.totalSlots) {
          return [...prev, value];
        }
        return prev;
      }
    });
  };

  const handleSaveMarketplaces = async () => {
    if (!marketplaceSummary) return;
    if (selectedMarketplaces.length === 0) {
      setMarketplaceError('Selecione pelo menos um marketplace');
      return;
    }
    try {
      setSavingMarketplaces(true);
      setMarketplaceError(null);
      setMarketplaceSuccess(null);
      const res = await fetch(`${apiBaseUrl}/api/user/marketplaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ marketplaces: selectedMarketplaces })
      });
      const data = await res.json();
      if (data.success) {
        setMarketplaceSuccess('Marketplaces configurados com sucesso!');
        await fetchMarketplaceSummary();
        setTimeout(() => {
          setShowMarketplaceConfig(false);
          setMarketplaceSuccess(null);
        }, 2000);
      } else {
        setMarketplaceError(data.error || 'Erro ao salvar marketplaces');
      }
    } catch (error) {
      setMarketplaceError('Erro de conexão. Tente novamente.');
    } finally {
      setSavingMarketplaces(false);
    }
  };

  const hasMarketplaceChanges = () => {
    if (!marketplaceSummary) return false;
    const original = marketplaceSummary.selectedMarketplaces.sort().join(',');
    const current = [...selectedMarketplaces].sort().join(',');
    return original !== current;
  };

  useEffect(() => {
    Object.values(BOT_TYPES).forEach(botType => {
      fetchTokens(botType);
    });
    fetchPromoTokens();
    fetchEntitlements();
    fetchMarketplaceSummary();
    fetchBotAccess();
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
      const response = await fetch(`${apiBaseUrl}/api/telegram/link-tokens/${tokenId}?botType=${botType}`, {
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

      {/* Marketplace Configuration Section */}
      {marketplaceSummary && marketplaceSummary.totalSlots > 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)] overflow-hidden">
          <button
            onClick={() => setShowMarketplaceConfig(!showMarketplaceConfig)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-[color:rgba(245,61,45,0.1)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
                  Configurar Marketplaces
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {marketplaceSummary.usedSlots > 0
                    ? `${marketplaceSummary.usedSlots}/${marketplaceSummary.totalSlots} slots utilizados`
                    : `${marketplaceSummary.totalSlots} slots disponíveis - Configure para liberar os bots`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {marketplaceSummary.totalSlots > 0 && marketplaceSummary.usedSlots === 0 && (
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                  Pendente
                </span>
              )}
              {marketplaceSummary.usedSlots > 0 && (
                <div className="flex gap-1">
                  {marketplaceSummary.selectedMarketplacesWithNames.slice(0, 3).map((mkt) => (
                    <span
                      key={mkt.value}
                      className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded"
                    >
                      {mkt.label}
                    </span>
                  ))}
                  {marketplaceSummary.selectedMarketplacesWithNames.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      +{marketplaceSummary.selectedMarketplacesWithNames.length - 3}
                    </span>
                  )}
                </div>
              )}
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showMarketplaceConfig ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {showMarketplaceConfig && (
            <div className="border-t border-[var(--color-border)] p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-main)]">Seus Slots de Marketplace</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Seu plano inclui {marketplaceSummary.totalSlots} marketplace{marketplaceSummary.totalSlots !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--color-primary)]">{selectedMarketplaces.length}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Selecionados</p>
                  </div>
                  <div className="h-10 w-px bg-gray-300" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">{marketplaceSummary.totalSlots}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Total</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-[var(--color-primary)] transition-all duration-300"
                    style={{ width: `${(selectedMarketplaces.length / marketplaceSummary.totalSlots) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {marketplaceSummary.totalSlots - selectedMarketplaces.length} slot{marketplaceSummary.totalSlots - selectedMarketplaces.length !== 1 ? 's' : ''} restante{marketplaceSummary.totalSlots - selectedMarketplaces.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--color-text-main)] mb-3">
                  Escolha os marketplaces que deseja utilizar:
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {marketplaceSummary.availableMarketplaces?.map((marketplace) => {
                    const isSelected = selectedMarketplaces.includes(marketplace.value);
                    const canSelect = isSelected || selectedMarketplaces.length < marketplaceSummary.totalSlots;

                    return (
                      <button
                        key={marketplace.value}
                        type="button"
                        onClick={() => canSelect && handleToggleMarketplace(marketplace.value)}
                        disabled={!canSelect}
                        className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[color:rgba(245,61,45,0.05)]'
                            : canSelect
                            ? 'border-gray-200 bg-white hover:border-[color:rgba(245,61,45,0.3)]'
                            : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                            isSelected
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[var(--color-text-main)] truncate">{marketplace.label}</p>
                        </div>
                        {isSelected && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
                            {selectedMarketplaces.indexOf(marketplace.value) + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {marketplaceError && (
                <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  {marketplaceError}
                </div>
              )}
              {marketplaceSuccess && (
                <div className="rounded-xl border-2 border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                  {marketplaceSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedMarketplaces(marketplaceSummary.selectedMarketplaces)}
                  disabled={!hasMarketplaceChanges() || savingMarketplaces}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveMarketplaces}
                  disabled={!hasMarketplaceChanges() || savingMarketplaces}
                  className="px-6 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[color:rgba(245,61,45,0.9)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {savingMarketplaces && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  Salvar Marketplaces
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Marketplaces
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Gerencie os marketplaces que você deseja utilizar para criar produtos.
          </p>
          <div className="mt-6 space-y-3 text-sm">
            <a
              href="/dashboard/settings/marketplaces"
              className="flex w-full items-center justify-between rounded-xl border-2 border-[var(--color-border)] bg-white px-4 py-3 font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <span>Configurar marketplaces</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          {
            title: "Bot de Promoções (marketplaces)",
            description:
              "Gera artes promocionais prontas para feed, story e WhatsApp a partir de links.",
            accent: "var(--color-primary)",
            tokenId: "token-para-liberar-bot-de-artes",
            promoTokenId: "token-promocional-bot-de-artes",
            botType: BOT_TYPES.PROMOCOES,
            generateBtnId: "btn-gerar-token-de-artes",
            generateBtnLabel: "Gerar token do Bot de Promoções",
            requiresMarketplace: true,
          },
          {
            title: "Bot de Download (redes sociais)",
            description:
              "Baixa mídia do Instagram, TikTok, YouTube e Pinterest com 1 link.",
            accent: "var(--color-info)",
            tokenId: "token-para-liberar-bot-de-download",
            promoTokenId: "token-promocional-bot-de-download",
            botType: BOT_TYPES.DOWNLOAD,
            generateBtnId: "btn-gerar-token-de-download",
            generateBtnLabel: "Gerar token do Bot de Download",
            requiresMarketplace: false,
          },
          {
            title: "Bot de Pins",
            description:
              "Cria cards automáticos para sua página pública a partir de pins do Pinterest.",
            accent: "#E60023",
            tokenId: "token-para-liberar-bot-de-pinterest",
            promoTokenId: "token-promocional-bot-de-pinterest",
            botType: BOT_TYPES.PINTEREST,
            generateBtnId: "btn-gerar-token-de-pinterest",
            generateBtnLabel: "Gerar token do Bot de Pins",
            requiresMarketplace: true,
          },
          {
            title: "Bot de Sugestões",
            description:
              "Recebe sugestões personalizadas de produtos baseadas nas suas preferências.",
            accent: "#9333EA",
            tokenId: "token-para-liberar-bot-de-sugestao",
            promoTokenId: "token-promocional-bot-de-sugestao",
            botType: BOT_TYPES.SUGGESTION,
            generateBtnId: "btn-gerar-token-de-sugestao",
            generateBtnLabel: "Gerar token do Bot de Sugestões",
            requiresMarketplace: false,
          },
        ].map((bot) => {
          const tokens = tokensByBot[bot.botType] || [];
          const promoTokens = promoTokensByBot[bot.botType] || [];
          const botIsCompact = isCompact[bot.botType] || false;
          const botIsGenerating = isGenerating[bot.botType] || false;
          const botRefreshingId = refreshingTokenId[bot.botType] || null;
          const botPromoRefreshingId = refreshingPromoTokenId[bot.botType] || null;
          const isLimitReached = tokens.length >= MAX_TOKENS_PER_BOT;

          // Access control checks
          const hasActiveSubscription = entitlements?.subscription?.status === 'ACTIVE' || entitlements?.subscription?.status === 'GRACE';
          const hasAccess = botAccess[bot.botType] ?? false;
          const needsMarketplaceConfig = bot.requiresMarketplace && marketplaceSummary && marketplaceSummary.totalSlots > 0 && marketplaceSummary.usedSlots === 0;
          const canGenerateToken = hasAccess && !needsMarketplaceConfig && !isLimitReached;

          // Determine status
          let statusText = "Sem acesso";
          let statusColor = "var(--color-text-secondary)";
          if (hasAccess) {
            statusText = "Acesso liberado";
            statusColor = bot.accent;
          }

          return (
            <div
              key={bot.title}
              className={`rounded-2xl border p-6 shadow-[var(--shadow-sm)] ${hasAccess ? 'border-[var(--color-border)] bg-white' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
                  {bot.title}
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${hasAccess ? 'text-white' : 'text-gray-600 bg-gray-200'}`}
                  style={hasAccess ? { backgroundColor: statusColor } : {}}
                >
                  {statusText}
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                {bot.description}
              </p>
              {/* Bot access info - shows source of access */}
              {(() => {
                const botEntitlements = entitlements?.botAccess?.filter(e => e.botType === bot.botType) || [];
                const promoAccess = botEntitlements.filter(e => e.source === 'PROMO');
                const planAccess = botEntitlements.filter(e => e.source === 'PLAN_INCLUDED');

                if (botEntitlements.length === 0) {
                  return (
                    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-[var(--color-text-secondary)]">
                      <span className="font-semibold text-gray-500">Nenhum acesso contratado</span>
                    </div>
                  );
                }

                return (
                  <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs text-[var(--color-text-secondary)]">
                    {planAccess.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 font-semibold">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Incluso no plano
                        </span>
                      </div>
                    )}
                    {promoAccess.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 font-semibold">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                          </svg>
                          Acesso promocional ({promoAccess.length})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Access warnings */}
              {!hasAccess && (
                <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-sm text-yellow-800">
                    Você precisa de uma assinatura ativa para usar este bot.
                    <a href="/dashboard/billing" className="underline ml-1 font-medium">
                      Ver planos
                    </a>
                  </p>
                </div>
              )}

              {hasAccess && needsMarketplaceConfig && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-800">
                    Configure seus marketplaces acima antes de gerar o token.
                  </p>
                </div>
              )}

              {/* Generate Token Button */}
              <button
                id={bot.generateBtnId}
                className="mt-4 w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                disabled={!canGenerateToken || botIsGenerating}
                onClick={() => handleGenerateToken(bot.botType)}
              >
                {botIsGenerating
                  ? "Gerando..."
                  : !hasAccess
                  ? "Sem acesso ao bot"
                  : needsMarketplaceConfig
                  ? "Configure marketplaces primeiro"
                  : isLimitReached
                  ? "Limite de tokens atingido"
                  : bot.generateBtnLabel}
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
