import useSWR from 'swr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

/**
 * Extended Error type for API errors
 */
interface ApiErrorExtended extends Error {
  status?: number;
  info?: Record<string, unknown>;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

/**
 * Generic fetcher for SWR
 */
async function fetcher<T>(url: string): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = new Error('API request failed') as ApiErrorExtended;
    error.status = response.status;
    error.info = await response.json().catch(() => ({}));
    throw error;
  }

  const data = await response.json();
  return data.data || data;
}

export interface OverviewKPIs {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  activeUsers: number;
  totalRenders: number;
  totalDownloads: number;
  activeArtsBots: number;
  activeDownloadBots: number;
  activePinterestBots: number;
  activeSuggestionBots: number;
  totalPinsCreated: number;
  totalSuggestionsGenerated: number;
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
}

export interface TimeSeriesData {
  usage: Array<{
    date: Date;
    renders: number;
    downloads: number;
  }>;
  newUsers: Array<{
    date: Date;
    count: number;
  }>;
  botLinks: Array<{
    date: Date;
    count: number;
  }>;
  revenue: Array<{
    date: Date;
    amount: number;
  }>;
}

export interface SubscriptionStatus {
  status: string;
  status_label: string;
  count: number;
}

export interface CriticalEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  users?: {
    email: string;
  } | null;
}

export interface KiwifyWebhook {
  id: string;
  event_type: string;
  event_type_label: string;
  received_at: string;
}

export interface ActiveToken {
  id: string;
  token: string;
  botType: string;
  createdAt: string;
  userEmail: string | null;
}

export interface OverviewData {
  kpis: OverviewKPIs;
  timeSeries: TimeSeriesData;
  subscriptionStatus: SubscriptionStatus[];
  criticalEvents: CriticalEvent[];
  kiwifyEvents: KiwifyWebhook[];
  activeTokens: ActiveToken[];
}

/**
 * Hook to fetch overview dashboard data
 */
export function useOverviewData(refreshInterval?: number) {
  const url = `${API_BASE_URL}/api/admin/overview`;

  const { data, error, isLoading, mutate } = useSWR<OverviewData>(
    url,
    fetcher,
    {
      refreshInterval: refreshInterval || 30000, // Default 30s refresh
      revalidateOnFocus: true,
    }
  );

  return {
    data,
    isLoading,
    isError: error,
    revalidate: mutate,
  };
}

/**
 * Hook to fetch only KPIs
 */
export function useOverviewKPIs(refreshInterval?: number) {
  const { data, isLoading, isError, revalidate } = useOverviewData(refreshInterval);

  return {
    kpis: data?.kpis,
    isLoading,
    isError,
    revalidate,
  };
}
