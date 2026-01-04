'use client';

/**
 * Admin Campaigns Page
 * Displays all promotional campaigns and allows admins to create, download, and delete them.
 */

import CampaignCard from '@/components/admin/CampaignCard';
import CreateCampaignModal from '@/components/admin/CreateCampaignModal';
import { getAdminToken } from '@/lib/admin-auth';
import { useEffect, useState } from 'react';

interface Campaign {
  id: string;
  name: string;
  price: number;
  product_url: string;
  main_video_url: string;
  created_at: string;
  asset_count?: number;
}

interface Stats {
  totalCampaigns?: number;
  totalDownloads?: number;
  [key: string]: number | undefined;
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchStats();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao carregar campanhas');
      }
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/campaigns/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setStats(data.data || null);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;

    try {
      const token = getAdminToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 204) {
        fetchCampaigns();
        fetchStats();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Falha ao excluir campanha');
        return;
      }

      fetchCampaigns();
      fetchStats();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Falha ao excluir campanha');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const token = getAdminToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/campaigns/${id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        throw new Error('Falha ao baixar campanha');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading campaign:', error);
      alert('Falha ao baixar campanha');
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    fetchCampaigns();
    fetchStats();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Campanhas Promocionais</h1>
        <p className="text-gray-600">Crie campanhas com os seus produtos nos marketplaces para que clientes afiliados possam divulgar</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-xl bg-[var(--color-secondary)] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
        >
          Nova Campanha
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.totalCampaigns !== undefined && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600">Total de Campanhas</h3>
              <p className="text-3xl font-bold mt-2">{stats.totalCampaigns}</p>
            </div>
          )}
          {stats.totalDownloads !== undefined && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600">Total de Downloads</h3>
              <p className="text-3xl font-bold mt-2">{stats.totalDownloads}</p>
            </div>
          )}
          {Object.entries(stats).map(([key, value]) => {
            if (key !== 'totalCampaigns' && key !== 'totalDownloads' && typeof value === 'number') {
              return (
                <div key={key} className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-600">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <p className="text-3xl font-bold mt-2">{value}</p>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
          <p className="text-gray-600 mb-4">Nenhuma campanha encontrada</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl bg-[var(--color-secondary)] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            Criar Primeira Campanha
          </button>
        </div>
      ) : (
        <div
          id="admin-campanhas-renderizadas"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
