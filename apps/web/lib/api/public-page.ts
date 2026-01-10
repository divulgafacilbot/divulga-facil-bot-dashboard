import { apiClient } from './client';

/**
 * Public Page Settings Types
 */
export interface PublicPageSettings {
  id: string;
  userId: string;
  publicSlug: string;
  displayName: string;
  headerColor: string;
  headerImageUrl?: string | null;
  logoUrl?: string | null;
  bio?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePublicPageSettingsInput {
  displayName?: string;
  headerColor?: string;
  bio?: string;
}

export interface PublicCard {
  id: string;
  cardSlug: string;
  userId: string;
  source: 'MANUAL' | 'BOT';
  marketplace: 'MERCADO_LIVRE' | 'SHOPEE' | 'AMAZON' | 'MAGALU';
  title: string;
  description?: string | null;
  price: string;
  originalPrice?: string | null;
  imageUrl: string;
  affiliateUrl: string;
  coupon?: string | null;
  category?: string | null;
  status: 'ACTIVE' | 'HIDDEN' | 'BLOCKED' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublicCardInput {
  title: string;
  description?: string;
  price: string;
  originalPrice?: string;
  affiliateUrl: string;
  marketplace: 'MERCADO_LIVRE' | 'SHOPEE' | 'AMAZON' | 'MAGALU';
  coupon?: string;
  category?: string;
}

export interface UpdatePublicCardInput {
  title?: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  affiliateUrl?: string;
  coupon?: string;
  category?: string;
}

export interface ListPublicCardsFilters {
  source?: 'MANUAL' | 'BOT';
  marketplace?: string;
  status?: 'ACTIVE' | 'HIDDEN';
  page?: number;
  limit?: number;
}

/**
 * Public Page API Client
 */
export const publicPageApi = {
  /**
   * Get user's public page settings
   */
  async getSettings(): Promise<PublicPageSettings> {
    const response = await apiClient.get<{ data: PublicPageSettings }>('/pinterest/settings');
    return response.data.data;
  },

  /**
   * Update user's public page settings
   */
  async updateSettings(data: UpdatePublicPageSettingsInput): Promise<PublicPageSettings> {
    const response = await apiClient.patch<{ data: PublicPageSettings }>('/pinterest/settings', data);
    return response.data.data;
  },

  /**
   * Upload header image
   */
  async uploadHeaderImage(file: File): Promise<{ headerImageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/api/pinterest/settings/header-image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to upload header image');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * List user's public cards
   */
  async listCards(filters?: ListPublicCardsFilters): Promise<{
    cards: PublicCard[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();

    if (filters?.source) params.append('source', filters.source);
    if (filters?.marketplace) params.append('marketplace', filters.marketplace);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await apiClient.get<{
      cards: PublicCard[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/pinterest/cards?${params.toString()}`);

    return {
      cards: response.data.cards,
      pagination: response.data.pagination,
    };
  },

  /**
   * Get single public card by ID
   */
  async getCard(cardId: string): Promise<PublicCard> {
    const response = await apiClient.get<{ data: PublicCard }>(`/pinterest/cards/${cardId}`);
    return response.data.data;
  },

  /**
   * Create a new public card (manual)
   */
  async createCard(data: CreatePublicCardInput, imageFile?: File): Promise<PublicCard> {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    if (imageFile) {
      formData.append('image', imageFile);
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/api/pinterest/cards`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to create card');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Update an existing public card
   */
  async updateCard(cardId: string, data: UpdatePublicCardInput): Promise<PublicCard> {
    const response = await apiClient.patch<{ data: PublicCard }>(`/pinterest/cards/${cardId}`, data);
    return response.data.data;
  },

  /**
   * Delete (soft delete) a public card
   */
  async deleteCard(cardId: string): Promise<void> {
    await apiClient.delete(`/pinterest/cards/${cardId}`);
  },

  /**
   * Toggle card status (ACTIVE/HIDDEN)
   */
  async toggleCardStatus(cardId: string, status: 'ACTIVE' | 'HIDDEN'): Promise<PublicCard> {
    const response = await apiClient.patch<{ data: PublicCard }>(`/pinterest/cards/${cardId}/status`, { status });
    return response.data.data;
  },

  /**
   * Get public profile by slug (public API)
   */
  async getPublicProfile(slug: string): Promise<{
    pageSettings: PublicPageSettings;
    cards: {
      items: PublicCard[];
      hasMore: boolean;
    };
  }> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error('Profile not found');
    }

    return response.json();
  },

  /**
   * Get public card by slug (public API)
   */
  async getPublicCard(userSlug: string, cardSlug: string): Promise<{
    card: PublicCard;
    pageSettings: PublicPageSettings;
  }> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/${userSlug}/${cardSlug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error('Card not found');
    }

    return response.json();
  },
};
