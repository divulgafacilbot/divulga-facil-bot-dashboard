'use client';

import { useEffect, useState } from 'react';
import { marketplaceApi } from '@/lib/api/marketplace';
import { MarketplaceProductStats } from '@/lib/api/types/marketplace';
import { Package, Eye, Star, EyeOff } from 'lucide-react';

export function ProductStats() {
  const [stats, setStats] = useState<MarketplaceProductStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await marketplaceApi.getProductStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-24" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Products */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total de Produtos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <Package size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Visible Products */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Visíveis</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.visible}</p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
            <Eye size={24} className="text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Em Destaque</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.featured}</p>
          </div>
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
            <Star size={24} className="text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Hidden Products */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ocultos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.hidden}</p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
            <EyeOff size={24} className="text-gray-600 dark:text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
