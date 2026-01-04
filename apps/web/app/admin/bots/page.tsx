'use client';

import { useEffect, useState } from 'react';
import { BOT_TYPE_LABELS, BotType } from '@/lib/admin-enums';
import { getAdminToken } from '@/lib/admin-auth';

export default function AdminBotsPage() {
  type BotStats = {
    totalBotLinks: number;
    recentLinkages: number;
    activeBots7d?: Array<{ botType: BotType; count: number }>;
  };
  type BotErrors = {
    errorsByOrigin?: Array<{ origin: string | null; count: number }>;
  };
  type BotUsage = {
    userId: string;
    user?: { email?: string | null };
    totalRenders: number;
    totalDownloads: number;
  };

  const [stats, setStats] = useState<BotStats | null>(null);
  const [errors, setErrors] = useState<BotErrors | null>(null);
  const [usage, setUsage] = useState<BotUsage[]>([]);

  useEffect(() => {
    const token = getAdminToken();
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/bots`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setStats(data.data || null));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/bots/errors`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setErrors(data.data || null));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/bots/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUsage(data.data || []));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Bots</h1>
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Links ativos</p>
            <p className="text-2xl font-bold">{stats.totalBotLinks}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Vinculados (7d)</p>
            <p className="text-2xl font-bold">{stats.recentLinkages}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Ativos por tipo (7d)</p>
            <p className="text-sm text-gray-700">
              {(stats.activeBots7d || []).map((item) => (
                <span key={item.botType} className="mr-2">
                  {BOT_TYPE_LABELS[item.botType] || item.botType}: {item.count}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Erros por bot</h2>
          <div className="space-y-2 text-sm text-gray-700 max-h-[500px] overflow-y-auto pr-1">
            {(errors?.errorsByOrigin || []).map((item) => (
              <div key={item.origin} className="flex justify-between">
                <span>{item.origin || 'Desconhecido'}</span>
                <span>{item.count}</span>
              </div>
            ))}
            {!errors?.errorsByOrigin?.length && <p>Nenhum erro registrado.</p>}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Uso por usuário</h2>
          <div className="space-y-2 text-sm text-gray-700 max-h-[500px] overflow-y-auto pr-1">
            {usage.map((row) => (
              <div key={row.userId} className="flex justify-between">
                <span>{row.user?.email || row.userId}</span>
                <span>
                  {row.totalRenders} renderizações · {row.totalDownloads} downloads
                </span>
              </div>
            ))}
            {!usage.length && <p>Nenhum uso registrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
