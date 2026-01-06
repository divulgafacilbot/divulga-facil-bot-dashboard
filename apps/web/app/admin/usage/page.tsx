'use client';

import { getAdminToken } from '@/lib/admin-auth';
import { useEffect, useState } from 'react';

export default function AdminUsagePage() {
  type UsageSortKey = 'renders' | 'downloads' | 'total';
  type SortOrder = 'asc' | 'desc';
  type UsageRow = {
    userId: string;
    user?: { email?: string | null };
    renders: number;
    downloads: number;
    total: number;
  };
  type UsageAlert = { id?: string; message?: string };

  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [sortBy, setSortBy] = useState<UsageSortKey>('renders');
  const [order, setOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    const token = getAdminToken();
    const params = new URLSearchParams({ sortBy, order });
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/usage?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUsage(data.data || []));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/usage/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setAlerts(data.data || []));

  }, [sortBy, order]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Uso</h1>
      <div className="mb-4 flex gap-3">
        <select
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as UsageSortKey)}
        >
          <option value="renders">Renderizações</option>
          <option value="downloads">Downloads</option>
          <option value="total">Total</option>
        </select>
        <select
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          value={order}
          onChange={(e) => setOrder(e.target.value as SortOrder)}
        >
          <option value="desc">Maior primeiro</option>
          <option value="asc">Menor primeiro</option>
        </select>
      </div>

      <div id='consumo-por-usuario' className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Consumo total por usuário</h2>
        <div className="space-y-2 text-sm text-gray-700 max-h-[500px] overflow-y-auto pr-1">
          {usage.map((row) => (
            <div key={row.userId} className="flex justify-between">
              <span>{row.user?.email || row.userId}</span>
              <span>
                {row.renders} renderizações · {row.downloads} downloads · {row.total} total
              </span>
            </div>
          ))}
          {!usage.length && <p>Nenhum consumo registrado.</p>}
        </div>
      </div>

      <div className="mx-auto grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        <div id='quantidade-de-imagens-por-user' className="min-w-[280px] bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Quantidade de imagens geradas por usuário</h2>
          <div className="space-y-2 text-sm text-gray-700 max-h-[360px] overflow-y-auto pr-1">
            {usage
              .slice()
              .sort((a, b) => (b.renders || 0) - (a.renders || 0))
              .map((row, index) => (
                <div key={row.userId} className="flex justify-between">
                  <span>
                    {index + 1}. {row.user?.email || row.userId}
                  </span>
                  <span>{row.renders} imagens</span>
                </div>
              ))}
            {!usage.length && <p>Nenhum dado disponível.</p>}
          </div>
        </div>

        <div id='quantidade-de-downloads-por-user' className="min-w-[280px] bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Quantidade de downloads por usuário</h2>
          <div className="space-y-2 text-sm text-gray-700 max-h-[360px] overflow-y-auto pr-1">
            {usage
              .slice()
              .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
              .map((row, index) => (
                <div key={row.userId} className="flex justify-between">
                  <span>
                    {index + 1}. {row.user?.email || row.userId}
                  </span>
                  <span>{row.downloads} downloads</span>
                </div>
              ))}
            {!usage.length && <p>Nenhum dado disponível.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
