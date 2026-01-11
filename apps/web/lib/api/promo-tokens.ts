import useSWR from 'swr';
import type {
  PromoToken,
  CreatePromoTokenInput,
  UpdatePromoTokenInput,
  GetPromoTokensFilters,
  PromoTokensListResponse,
} from '../../types/promo-token.types';
import { getAdminToken } from '../admin-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

/**
 * Extended Error type for API errors
 */
interface ApiErrorExtended extends Error {
  status?: number;
  info?: Record<string, unknown>;
}

/**
 * Generic fetcher for SWR
 */
async function fetcher<T>(url: string): Promise<T> {
  const token = getAdminToken();
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

/**
 * Generic mutation function
 */
async function mutate<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<T> {
  const token = getAdminToken();
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: 'include',
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error('API request failed') as ApiErrorExtended;
    error.status = response.status;
    error.info = await response.json().catch(() => ({}));
    throw error;
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Specialized fetcher for promo tokens list that handles the API response structure
 */
async function promoTokensListFetcher(url: string): Promise<PromoTokensListResponse> {
  const token = getAdminToken();
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

  const responseData = await response.json();
  // API returns { success: true, data: [...], pagination: {...} }
  // Hook expects { tokens: [...], pagination: {...} }
  return {
    tokens: responseData.data || [],
    pagination: responseData.pagination,
  };
}

/**
 * Hook to fetch list of promotional tokens with filters
 */
export function usePromoTokens(filters?: GetPromoTokensFilters) {
  const params = new URLSearchParams();
  if (filters?.botType) params.append('botType', filters.botType);
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/admin/promo-tokens${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate: revalidate } = useSWR<PromoTokensListResponse>(
    url,
    promoTokensListFetcher
  );

  return {
    tokens: data?.tokens || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    revalidate,
  };
}

/**
 * Hook to fetch a single promotional token by ID
 */
export function usePromoToken(id: string | null) {
  const url = id ? `${API_BASE_URL}/api/admin/promo-tokens/${id}` : null;

  const { data, error, isLoading, mutate: revalidate } = useSWR<PromoToken>(
    url,
    fetcher
  );

  return {
    token: data,
    isLoading,
    isError: error,
    revalidate,
  };
}

/**
 * Create a new promotional token
 */
export async function createPromoToken(input: CreatePromoTokenInput): Promise<PromoToken> {
  return mutate(`${API_BASE_URL}/api/admin/promo-tokens`, 'POST', input);
}

/**
 * Update a promotional token
 */
export async function updatePromoToken(
  id: string,
  updates: UpdatePromoTokenInput
): Promise<PromoToken> {
  return mutate(`${API_BASE_URL}/api/admin/promo-tokens/${id}`, 'PATCH', updates);
}

/**
 * Delete a promotional token
 */
export async function deletePromoToken(id: string): Promise<void> {
  return mutate(`${API_BASE_URL}/api/admin/promo-tokens/${id}`, 'DELETE');
}

/**
 * Rotate a promotional token (create new, deactivate old)
 */
export async function rotatePromoToken(id: string): Promise<PromoToken> {
  return mutate(`${API_BASE_URL}/api/admin/promo-tokens/${id}/rotate`, 'POST');
}

/**
 * Hook for creating promotional tokens with optimistic updates
 */
export function useCreatePromoToken() {
  return {
    createToken: async (input: CreatePromoTokenInput) => {
      const result = await createPromoToken(input);
      return result;
    },
  };
}

/**
 * Hook for updating promotional tokens with optimistic updates
 */
export function useUpdatePromoToken() {
  return {
    updateToken: async (id: string, updates: UpdatePromoTokenInput) => {
      const result = await updatePromoToken(id, updates);
      return result;
    },
  };
}

/**
 * Hook for deleting promotional tokens with optimistic updates
 */
export function useDeletePromoToken() {
  return {
    deleteToken: async (id: string) => {
      await deletePromoToken(id);
    },
  };
}

/**
 * Hook for rotating promotional tokens with optimistic updates
 */
export function useRotatePromoToken() {
  return {
    rotateToken: async (id: string) => {
      const result = await rotatePromoToken(id);
      return result;
    },
  };
}
