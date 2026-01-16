"use client";

import { Button } from "@/components/forms/Button";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  slots: Array<{ id: string; marketplace: string | null; source: string }>;
}

export default function MarketplacesSettingsPage() {
  const [summary, setSummary] = useState<MarketplaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.marketplaces.getSummary();
      if (response.success) {
        setSummary(response.data);
        setSelectedMarketplaces(response.data.selectedMarketplaces);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMarketplace = (value: string) => {
    if (!summary) return;

    setSelectedMarketplaces((prev) => {
      if (prev.includes(value)) {
        // Remove marketplace
        return prev.filter((m) => m !== value);
      } else {
        // Add marketplace (if we have available slots)
        if (prev.length < summary.totalSlots) {
          return [...prev, value];
        }
        return prev;
      }
    });
  };

  const handleSave = async () => {
    if (!summary) return;

    if (selectedMarketplaces.length === 0) {
      setError("Selecione pelo menos um marketplace");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.marketplaces.selectMarketplaces(selectedMarketplaces);

      if (response.success) {
        setSuccess(response.message || "Marketplaces atualizados com sucesso!");
        // Reload summary to get updated data
        await loadSummary();
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erro ao salvar marketplaces");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!summary) return false;
    const original = summary.selectedMarketplaces.sort().join(",");
    const current = [...selectedMarketplaces].sort().join(",");
    return original !== current;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <div className="text-center">
          <p className="text-[var(--color-danger)]">{error || "Erro ao carregar dados"}</p>
          <Button onClick={loadSummary} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // No slots available
  if (summary.totalSlots === 0) {
    return (
      <>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Configuracoes
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Marketplaces
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
            Selecione seus Marketplaces
          </h1>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-[var(--color-background)] flex items-center justify-center">
              <svg className="h-8 w-8 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-main)]">
              Sem slots de marketplace
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Seu plano atual nao inclui acesso a marketplaces.
              <br />
              Faca upgrade do seu plano para desbloquear esta funcionalidade.
            </p>
            <Button className="mt-6">
              Ver planos disponiveis
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Configuracoes
        </Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Marketplaces
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
          Selecione seus Marketplaces
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Escolha os marketplaces que deseja utilizar. Voce pode criar produtos apenas nos marketplaces selecionados.
        </p>
      </div>

      {/* Slots Summary Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Seus Slots</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Seu plano inclui {summary.totalSlots} slot{summary.totalSlots !== 1 ? "s" : ""} de marketplace
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">{selectedMarketplaces.length}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Selecionados</p>
            </div>
            <div className="h-12 w-px bg-[var(--color-border)]" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-text-secondary)]">{summary.totalSlots}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Disponiveis</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 rounded-full bg-[var(--color-background)]">
            <div
              className="h-2 rounded-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${(selectedMarketplaces.length / summary.totalSlots) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            {summary.totalSlots - selectedMarketplaces.length} slot{summary.totalSlots - selectedMarketplaces.length !== 1 ? "s" : ""} restante{summary.totalSlots - selectedMarketplaces.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Marketplace Selection Grid */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Escolha seus Marketplaces</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Clique para selecionar ou remover um marketplace
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.availableMarketplaces.map((marketplace) => {
            const isSelected = selectedMarketplaces.includes(marketplace.value);
            const canSelect = isSelected || selectedMarketplaces.length < summary.totalSlots;

            return (
              <button
                key={marketplace.value}
                type="button"
                onClick={() => canSelect && handleToggleMarketplace(marketplace.value)}
                disabled={!canSelect}
                className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? "border-[var(--color-primary)] bg-[color:rgba(245,61,45,0.05)]"
                    : canSelect
                    ? "border-[var(--color-border)] bg-white hover:border-[color:rgba(245,61,45,0.3)]"
                    : "border-[var(--color-border)] bg-[var(--color-background)] opacity-50 cursor-not-allowed"
                }`}
              >
                {/* Checkbox indicator */}
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-white"
                  }`}
                >
                  {isSelected && (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-[var(--color-text-main)]">{marketplace.label}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{marketplace.value}</p>
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

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-xl border-2 border-[var(--color-danger)] bg-[color:rgba(239,68,68,0.1)] px-4 py-3 text-sm font-semibold text-[var(--color-danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border-2 border-[var(--color-success)] bg-[color:rgba(34,197,94,0.1)] px-4 py-3 text-sm font-semibold text-[var(--color-success)]">
          {success}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => setSelectedMarketplaces(summary.selectedMarketplaces)}
          disabled={!hasChanges() || saving}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={!hasChanges()}>
          Salvar alteracoes
        </Button>
      </div>
    </>
  );
}
