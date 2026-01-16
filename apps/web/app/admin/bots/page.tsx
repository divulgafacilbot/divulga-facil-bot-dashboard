'use client';

import { useEffect, useState } from 'react';
import { BOT_TYPE_LABELS, BotType } from '@/lib/admin-enums';
import { getAdminToken } from '@/lib/admin-auth';

type BotStats = {
  totalBotLinks: number;
  recentLinkages: number;
  activeBots7d?: Array<{ botType: BotType; count: number }>;
};

type BotErrors = {
  errorsByOrigin?: Array<{ origin: string | null; count: number }>;
};

type TimeSeriesData = {
  usage: { date: string; renders: number; downloads: number }[];
  botLinksByType: {
    arts: { date: string; count: number }[];
    download: { date: string; count: number }[];
    pinterest: { date: string; count: number }[];
    suggestion: { date: string; count: number }[];
  };
  suggestions: { date: string; count: number }[];
  pinsCreated: { date: string; count: number }[];
};

type OverviewData = {
  timeSeries: TimeSeriesData;
};

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const toISODate = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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

const buildLinePoints = (values: number[], width: number, height: number, maxValue?: number) => {
  if (values.length === 0) return '';
  const max = maxValue ?? Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    })
    .join(' ');
};

// Single Line Chart Component
const SingleLineChart = ({
  data,
  color,
  label,
  height = 120,
}: {
  data: { date: string; count: number }[];
  color: string;
  label: string;
  height?: number;
}) => {
  const width = 400;
  const values = data.map((d) => d.count);
  const total = values.reduce((sum, v) => sum + v, 0);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <span className="text-2xl font-bold" style={{ color }}>{total}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>{data.length ? formatDate(data[0].date) : '-'}</span>
        <span>{data.length ? formatDate(data[data.length - 1].date) : '-'}</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={buildLinePoints(values, width, height)}
        />
      </svg>
    </div>
  );
};

// Multi-line chart component for bot links by type
const MultiLineChart = ({
  data,
  series,
  height = 160,
}: {
  data: { date: string; arts?: number; download?: number; pinterest?: number; suggestion?: number }[];
  series: { key: string; color: string; label: string }[];
  height?: number;
}) => {
  const width = 520;
  const allValues = data.flatMap((row) =>
    series.map((s) => Number(row[s.key as keyof typeof row] ?? 0))
  );
  const maxValue = Math.max(...allValues, 1);

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
              data.map((row) => Number(row[item.key as keyof typeof row] ?? 0)),
              width,
              height,
              maxValue
            )}
          />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function AdminBotsPage() {
  const [stats, setStats] = useState<BotStats | null>(null);
  const [errors, setErrors] = useState<BotErrors | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();

    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/bots`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/bots/errors`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ]).then(([statsData, errorsData, overviewData]) => {
      setStats(statsData.data || null);
      setErrors(errorsData.data || null);
      setOverview(overviewData.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  // Build bot links by type series for chart
  const botLinksByType = overview?.timeSeries?.botLinksByType;
  const buildBotLinksSeries = () => {
    const artsSeries = buildDailySeries(botLinksByType?.arts || [], 30);
    const downloadSeries = buildDailySeries(botLinksByType?.download || [], 30);
    const pinterestSeries = buildDailySeries(botLinksByType?.pinterest || [], 30);
    const suggestionSeries = buildDailySeries(botLinksByType?.suggestion || [], 30);

    return artsSeries.map((item, index) => ({
      date: item.date,
      arts: item.count,
      download: downloadSeries[index]?.count || 0,
      pinterest: pinterestSeries[index]?.count || 0,
      suggestion: suggestionSeries[index]?.count || 0,
    }));
  };

  const botLinksChartData = buildBotLinksSeries();

  // Build individual time series
  const rendersSeries = buildDailySeries(
    (overview?.timeSeries?.usage || []).map((u) => ({ date: u.date, count: u.renders })),
    30
  );
  const downloadsSeries = buildDailySeries(
    (overview?.timeSeries?.usage || []).map((u) => ({ date: u.date, count: u.downloads })),
    30
  );
  const suggestionsSeries = buildDailySeries(overview?.timeSeries?.suggestions || [], 30);
  const pinsSeries = buildDailySeries(overview?.timeSeries?.pinsCreated || [], 30);

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2D6AEF]">
          Métricas de Bots
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Estatísticas dos Bots</h1>
        <p className="mt-2 text-sm text-gray-600">
          Acompanhe vinculações, erros e uso dos bots nos últimos 30 dias.
        </p>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-gray-600">Links ativos</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalBotLinks}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-gray-600">Vinculados (7d)</p>
            <p className="text-3xl font-bold text-gray-900">{stats.recentLinkages}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-gray-600">Ativos por tipo (7d)</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(stats.activeBots7d || []).map((item) => (
                <span key={item.botType} className="text-sm px-2 py-1 bg-gray-100 rounded">
                  {BOT_TYPE_LABELS[item.botType] || item.botType}: <strong>{item.count}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bots Vinculados por Tipo (30d) */}
      <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bots Vinculados por Tipo (30d)</h2>
        <MultiLineChart
          data={botLinksChartData}
          series={[
            { key: 'arts', color: '#F53D2D', label: 'Promoções' },
            { key: 'download', color: '#2D6AEF', label: 'Download' },
            { key: 'pinterest', color: '#E60023', label: 'Pinterest' },
            { key: 'suggestion', color: '#A855F7', label: 'Sugestões' },
          ]}
        />
      </div>

      {/* 4 Individual Metric Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <SingleLineChart
          data={rendersSeries}
          color="#F53D2D"
          label="Renderizações (30d)"
        />
        <SingleLineChart
          data={downloadsSeries}
          color="#2D6AEF"
          label="Downloads (30d)"
        />
        <SingleLineChart
          data={suggestionsSeries}
          color="#A855F7"
          label="Sugestões (30d)"
        />
        <SingleLineChart
          data={pinsSeries}
          color="#E60023"
          label="Pins Criados (30d)"
        />
      </div>

      {/* Errors Section */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Erros por Bot</h2>
        <div className="space-y-2 text-sm text-gray-700 max-h-[400px] overflow-y-auto pr-1">
          {(errors?.errorsByOrigin || []).map((item) => (
            <div key={item.origin} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
              <span>{item.origin || 'Desconhecido'}</span>
              <span className="font-semibold text-red-600">{item.count}</span>
            </div>
          ))}
          {!errors?.errorsByOrigin?.length && <p className="text-gray-500">Nenhum erro registrado.</p>}
        </div>
      </div>
    </div>
  );
}
