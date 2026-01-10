'use client';

import { getAdminToken } from '@/lib/admin-auth';
import { useEffect, useState } from 'react';

type UsageByBotType = {
  byRenders: { userId: string; email: string | null; renders: number }[];
  byDownloads: { userId: string; email: string | null; downloads: number }[];
  bySuggestions: { userId: string; email: string | null; suggestions: number }[];
  byPins: { userId: string; email: string | null; pinsCreated: number }[];
};

export default function AdminUsagePage() {
  const [usageByBot, setUsageByBot] = useState<UsageByBotType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/usage/by-bot-type`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setUsageByBot(data.data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2D6AEF]">
          Métricas de Uso
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Uso por Tipo de Bot</h1>
        <p className="mt-2 text-sm text-gray-600">
          Acompanhe o consumo de cada bot separadamente por usuário.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Bot de Artes - Renderizações */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#F53D2D]/10 flex items-center justify-center">
              <span className="text-lg">🎨</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Bot de Artes</h2>
              <p className="text-xs text-gray-500">Por nº de renderizações</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-700 max-h-[400px] overflow-y-auto pr-1">
            {usageByBot?.byRenders.map((row, index) => (
              <div key={row.userId} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                <span className="truncate flex-1 mr-2">
                  <span className="text-gray-400 mr-1">{index + 1}.</span>
                  {row.email || row.userId.slice(0, 8)}
                </span>
                <span className="font-semibold text-[#F53D2D]">{row.renders}</span>
              </div>
            ))}
            {!usageByBot?.byRenders.length && <p className="text-gray-500">Nenhum dado disponível.</p>}
          </div>
        </div>

        {/* Bot de Download - Downloads */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#2D6AEF]/10 flex items-center justify-center">
              <span className="text-lg">📥</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Bot de Download</h2>
              <p className="text-xs text-gray-500">Por nº de downloads</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-700 max-h-[400px] overflow-y-auto pr-1">
            {usageByBot?.byDownloads.map((row, index) => (
              <div key={row.userId} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                <span className="truncate flex-1 mr-2">
                  <span className="text-gray-400 mr-1">{index + 1}.</span>
                  {row.email || row.userId.slice(0, 8)}
                </span>
                <span className="font-semibold text-[#2D6AEF]">{row.downloads}</span>
              </div>
            ))}
            {!usageByBot?.byDownloads.length && <p className="text-gray-500">Nenhum dado disponível.</p>}
          </div>
        </div>

        {/* Bot de Sugestões - Sugestões */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#A855F7]/10 flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Bot de Sugestões</h2>
              <p className="text-xs text-gray-500">Por nº de sugestões</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-700 max-h-[400px] overflow-y-auto pr-1">
            {usageByBot?.bySuggestions.map((row, index) => (
              <div key={row.userId} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                <span className="truncate flex-1 mr-2">
                  <span className="text-gray-400 mr-1">{index + 1}.</span>
                  {row.email || row.userId.slice(0, 8)}
                </span>
                <span className="font-semibold text-[#A855F7]">{row.suggestions}</span>
              </div>
            ))}
            {!usageByBot?.bySuggestions.length && <p className="text-gray-500">Nenhum dado disponível.</p>}
          </div>
        </div>

        {/* Bot de Pins - Pins Criados */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#E60023]/10 flex items-center justify-center">
              <span className="text-lg">📌</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Bot de Pins</h2>
              <p className="text-xs text-gray-500">Por nº de pins criados</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-700 max-h-[400px] overflow-y-auto pr-1">
            {usageByBot?.byPins.map((row, index) => (
              <div key={row.userId} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                <span className="truncate flex-1 mr-2">
                  <span className="text-gray-400 mr-1">{index + 1}.</span>
                  {row.email || row.userId.slice(0, 8)}
                </span>
                <span className="font-semibold text-[#E60023]">{row.pinsCreated}</span>
              </div>
            ))}
            {!usageByBot?.byPins.length && <p className="text-gray-500">Nenhum dado disponível.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
