'use client';

import { getAdminToken } from '@/lib/admin-auth';
import { useEffect, useState } from 'react';

type OverviewPayload = {
  kpis: {
    totalUsers: number;
    newUsers7d: number;
    newUsers30d: number;
    activeUsers: number;
    totalRenders: number;
    totalDownloads: number;
    activeArtsBots: number;
    activeDownloadBots: number;
    rendersByMarketplace: {
      MERCADO_LIVRE: number;
      MAGALU: number;
      SHOPEE: number;
      AMAZON: number;
    };
    downloadsByPlatform: {
      INSTAGRAM: number;
      TIKTOK: number;
      PINTEREST: number;
      YOUTUBE: number;
    };
    criticalErrors: number;
  };
  timeSeries: {
    usage: { date: string; renders: number; downloads: number }[];
    newUsers: { date: string; count: number }[];
    botLinks: { date: string; count: number }[];
    revenue: { date: string; amount: number }[];
  };
  subscriptionStatus: { status: string; count: number }[];
  criticalEvents: Array<{ id?: string; event_type?: string; created_at?: string }>;
  kiwifyEvents: Array<{ id?: string; event_type?: string; event_id?: string; received_at?: string }>;
  activeTokens: {
    id: string;
    token: string;
    botType: string;
    createdAt: string;
    userEmail: string | null;
  }[];
};

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const buildLinePoints = (values: number[], width: number, height: number) => {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    })
    .join(' ');
};

const toISODate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildDailySeries = (rows: { date: string; count: number }[], days: number) => {
  const counts = new Map(
    rows.map((row) => [toISODate(new Date(row.date)), row.count])
  );
  const series = [];
  const today = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const key = toISODate(date);
    series.push({
      date: key,
      count: counts.get(key) || 0,
    });
  }
  return series;
};

const buildPieBackground = (slices: { value: number; color: string }[]) => {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (!total) {
    return '#E5E7EB';
  }
  let offset = 0;
  const parts = slices.map((slice) => {
    const start = offset;
    const end = offset + (slice.value / total) * 100;
    offset = end;
    return `${slice.color} ${start}% ${end}%`;
  });
  return `conic-gradient(${parts.join(', ')})`;
};

const LineChart = ({
  data,
  series,
}: {
  data: { date: string;[key: string]: number | string }[];
  series: { key: string; color: string }[];
}) => {
  const width = 520;
  const height = 160;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{data.length ? formatDate(data[0].date) : '-'}</span>
        <span>{data.length ? formatDate(data[data.length - 1].date) : '-'}</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="mt-3">
        {series.map((item) => (
          <polyline
            key={item.key}
            fill="none"
            stroke={item.color}
            strokeWidth="2"
            points={buildLinePoints(
              data.map((row) => Number(row[item.key] ?? 0)),
              width,
              height
            )}
          />
        ))}
      </svg>
    </div>
  );
};

const BarList = ({ data }: { data: { label: string; value: number }[] }) => {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-semibold text-gray-900">{item.value}</span>
          </div>
          <div className="mt-1 h-2 w-full rounded bg-gray-100">
            <div
              className="h-2 rounded bg-[var(--color-primary)]"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAdminToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setOverview(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch overview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  const kpis = overview?.kpis;
  const newUsersSeries = buildDailySeries(overview?.timeSeries?.newUsers || [], 30);
  const maxNewUsers = Math.max(...newUsersSeries.map((item) => item.count), 1);
  const revenueSeries = (overview?.timeSeries?.revenue || []).map((row) => ({
    date: row.date,
    amount: row.amount,
  }));
  const revenue30d = revenueSeries.reduce((sum, row) => sum + (row.amount || 0), 0);
  const activeTokens = overview?.activeTokens ?? [];
  const rendersByMarketplace = kpis?.rendersByMarketplace || {
    MERCADO_LIVRE: 0,
    MAGALU: 0,
    SHOPEE: 0,
    AMAZON: 0,
  };
  const downloadsByPlatform = kpis?.downloadsByPlatform || {
    INSTAGRAM: 0,
    TIKTOK: 0,
    PINTEREST: 0,
    YOUTUBE: 0,
  };
  const artTotal = kpis?.totalRenders || 0;
  const downloadTotal = kpis?.totalDownloads || 0;
  const artPieBackground = buildPieBackground([
    { value: rendersByMarketplace.MERCADO_LIVRE, color: '#FBBF24' },
    { value: rendersByMarketplace.MAGALU, color: '#2D6AEF' },
    { value: rendersByMarketplace.SHOPEE, color: '#F97316' },
    { value: rendersByMarketplace.AMAZON, color: '#374151' },
  ]);
  const downloadPieBackground = buildPieBackground([
    { value: downloadsByPlatform.INSTAGRAM, color: '#E1306C' },
    { value: downloadsByPlatform.TIKTOK, color: '#111827' },
    { value: downloadsByPlatform.PINTEREST, color: '#7C3AED' },
    { value: downloadsByPlatform.YOUTUBE, color: '#FF0000' },
  ]);
  const stats = [
    { name: 'Usuários Ativos', value: kpis?.activeUsers || 0 },
    { name: 'Quantidade de bots de artes ativos', value: kpis?.activeArtsBots || 0 },
    { name: 'Quantidade de bots de download ativos', value: kpis?.activeDownloadBots || 0 },

    {
      name: 'Faturamento (30d)',
      value: revenue30d.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
    },
  ];

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2D6AEF]">
          Visão geral
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
        <p className="mt-2 text-sm text-gray-600">
          Acompanhe desempenho, crescimento e sinais críticos da operação.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex w-full flex-col gap-6 lg:w-1/2">
              <div className="flex flex-col">
                <h1 className="text-base font-semibold uppercase tracking-[0.2em] text-gray-700 mb-0">
                  BOT DE ARTES
                </h1>
                <p className="text-sm font-semibold tracking-[0.2em] text-gray-500">
                  Métrica detalhada
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Imagens Geradas</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{artTotal}</p>
              </div>
              <div className="flex items-center justify-center">
                <div
                  className="h-48 w-48 rounded-full"
                  style={{ background: artPieBackground }}
                />
              </div>
            </div>
            <div className="grid w-full gap-3 lg:w-1/2">
              <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                Imagens geradas por plataforma
              </h1>
              <div className="relative rounded-xl border border-[var(--color-border)] bg-white p-2 pl-8">
                <div className="absolute left-0 top-0 h-full w-5 rounded-l-xl bg-[#FBBF24]" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 mb-0">
                  Mercado Livre
                </p>
                <p className="mt-0 mb-0 text-2xl font-bold text-gray-900">
                  {rendersByMarketplace.MERCADO_LIVRE}
                </p>
              </div>
              <div className="relative rounded-xl border border-[var(--color-border)] bg-white p-2 pl-8">
                <div className="absolute left-0 top-0 h-full w-5 rounded-l-xl bg-[#2D6AEF]" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 mb-0">
                  Magalu
                </p>
                <p className="mt-0 mb-0 text-2xl font-bold text-gray-900">
                  {rendersByMarketplace.MAGALU}
                </p>
              </div>
              <div className="relative rounded-xl border border-[var(--color-border)] bg-white p-2 pl-8">
                <div className="absolute left-0 top-0 h-full w-5 rounded-l-xl bg-[#F97316]" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 mb-0">
                  Shopee
                </p>
                <p className="mt-0 mb-0 text-2xl font-bold text-gray-900">
                  {rendersByMarketplace.SHOPEE}
                </p>
              </div>
              <div className="relative rounded-xl border border-[var(--color-border)] bg-white p-2 pl-8">
                <div className="absolute left-0 top-0 h-full w-5 rounded-l-xl bg-[#374151]" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 mb-0">
                  Amazon
                </p>
                <p className="mt-0 mb-0 text-2xl font-bold text-gray-900">
                  {rendersByMarketplace.AMAZON}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex w-full flex-col gap-6 lg:w-1/2">
              <div className="flex flex-col">
                <h1 className="text-base font-semibold uppercase tracking-[0.2em] text-gray-700 mb-0">
                  BOT DE DOWNLOAD
                </h1>
                <p className="text-sm font-semibold tracking-[0.2em] text-gray-500">
                  Métrica detalhada
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Downloads</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{downloadTotal}</p>
              </div>
              <div className="flex items-center justify-center">
                <div
                  className="h-48 w-48 rounded-full"
                  style={{ background: downloadPieBackground }}
                />
              </div>
            </div>
            <div className="grid w-full gap-3 lg:w-1/2">
              <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                Downloads por plataforma
              </h1>
              <div className="relative rounded-xl border border-[var(--color-border)] bg-white p-2 pl-8">
                <div className="absolute left-0 top-0 h-full w-5 rounded-l-xl bg-[#E1306C]" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 mb-0">
                  Instagram
                </p>
                <p className="mt-0 mb-0 text-2xl font-bold text-gray-900">
                  {downloadsByPlatform.INSTAGRAM}
                </p>
              </div>
              <div className="relative rounded-xl border border-[var(--color-border)] bg-white p-2 pl-8">
                <div className="absolute left-0 top-0 h-full w-5 rounded-l-xl bg-[#111827]" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 mb-0">
                  TikTok
                </p>
                <p className="mt-0 mb-0 text-2xl font-bold text-gray-900">
                  {downloadsByPlatform.TIKTOK}
                </p>
              </div>
              <div className="relative rounded-xl border border-[var(--color-border)] bg-white p-2 pl-8">
                <div className="absolute left-0 top-0 h-full w-5 rounded-l-xl bg-[#7C3AED]" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 mb-0">
                  Pinterest
                </p>
                <p className="mt-0 mb-0 text-2xl font-bold text-gray-900">
                  {downloadsByPlatform.PINTEREST}
                </p>
              </div>
              <div className="relative rounded-xl border border-[var(--color-border)] bg-white p-2 pl-8">
                <div className="absolute left-0 top-0 h-full w-5 rounded-l-xl bg-[#FF0000]" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 mb-0">
                  YouTube
                </p>
                <p className="mt-0 mb-0 text-2xl font-bold text-gray-900">
                  {downloadsByPlatform.YOUTUBE}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]"
          >
            <p className="text-sm font-medium text-gray-600">{stat.name}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Novos usuários por dia (30d)</h2>
          <div className="flex items-end gap-1 h-40">
            {newUsersSeries.map((item) => (
              <div
                key={item.date}
                className="flex-1 rounded-t bg-[#2D6AEF]/70 hover:bg-[#2D6AEF]"
                style={{ height: `${(item.count / maxNewUsers) * 100}%` }}
                title={`${formatDate(item.date)}: ${item.count}`}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2D6AEF]" />
              Novos usuários
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>{newUsersSeries.length ? formatDate(newUsersSeries[0].date) : '-'}</span>
            <span>{newUsersSeries.length ? formatDate(newUsersSeries[newUsersSeries.length - 1].date) : '-'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Receita (30d)</h2>
          <LineChart
            data={revenueSeries}
            series={[{ key: 'amount', color: '#22C55E' }]}
          />
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              Receita
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Renderizações x Downloads (30d)</h2>
          <LineChart
            data={overview?.timeSeries?.usage || []}
            series={[
              { key: 'renders', color: '#F53D2D' },
              { key: 'downloads', color: '#2D6AEF' },
            ]}
          />
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#F53D2D]" />
              Renderizações
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2D6AEF]" />
              Downloads
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bots Vinculados (30d)</h2>
          <LineChart
            data={(overview?.timeSeries?.botLinks || []).map((row) => ({
              date: row.date,
              count: row.count,
            }))}
            series={[{ key: 'count', color: '#F59E0B' }]}
          />
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              Bots vinculados
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
