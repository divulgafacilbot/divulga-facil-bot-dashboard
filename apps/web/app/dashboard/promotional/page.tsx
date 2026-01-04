'use client';

/**
 * Promotional Campaigns Page
 * Displays available promotional campaigns for users to browse and download
 */

import CampaignCard from '@/components/dashboard/CampaignCard';
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

export default function PromotionalPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/user/campaigns`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(data?.error || 'Failed to fetch campaigns');
        return;
      }

      const campaignsData = Array.isArray(data) ? data : data?.data || [];
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/user/campaigns/${id}/download`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        console.error('Failed to download campaign');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading campaign:', error);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Material Promocional
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
          Campanhas Disponíveis
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Baixe materiais para divulgar produtos
        </p>
      </div>

      <div id='cliente-campanha-disponivel' className="mt-6">
        {loading ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm animate-pulse"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <div className="h-10 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-12 shadow-[var(--shadow-sm)] text-center">
            <p className="text-[var(--color-text-secondary)]">
              Nenhum material disponível no momento
            </p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
