import useSWR from 'swr';
import type { BotType } from '../admin-enums';
import type { ApiError } from '@/types';

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

/**
 * Generic mutation function
 */
async function mutate<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: 'include',
    ...(body && { body: JSON.stringify(body) }),
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

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  bot_type?: string;
  status: string;
  status_label: string;
  priority: string;
  priority_label: string;
  created_at: string;
  updated_at: string;
  closed_seen_at: string | null;
  users?: {
    id: string;
    email: string;
  } | null;
  support_messages?: SupportMessage[];
  _count?: {
    support_messages: number;
  };
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_role: 'user' | 'admin';
  message: string;
  created_at: string;
}

export interface GetSupportTicketsFilters {
  status?: string;
  priority?: string;
  category?: string;
  userId?: string;
  botType?: BotType | string;
  page?: number;
  limit?: number;
}

export interface SupportTicketsResponse {
  tickets: SupportTicket[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SupportStats {
  openTickets: number;
  inProgressTickets: number;
  closedTickets: number;
}

/**
 * Hook to fetch support tickets with filters
 */
export function useSupportTickets(filters?: GetSupportTicketsFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.botType) params.append('botType', filters.botType);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/admin/support/tickets${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate: revalidate } = useSWR<SupportTicketsResponse>(
    url,
    fetcher
  );

  return {
    tickets: data?.tickets || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    revalidate,
  };
}

/**
 * Hook to fetch a single support ticket by ID
 */
export function useSupportTicket(id: string | null) {
  const url = id ? `${API_BASE_URL}/api/admin/support/tickets/${id}` : null;

  const { data, error, isLoading, mutate: revalidate } = useSWR<SupportTicket>(
    url,
    fetcher
  );

  return {
    ticket: data,
    isLoading,
    isError: error,
    revalidate,
  };
}

/**
 * Hook to fetch support statistics
 */
export function useSupportStats() {
  const url = `${API_BASE_URL}/api/admin/support/stats`;

  const { data, error, isLoading, mutate: revalidate } = useSWR<SupportStats>(
    url,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    stats: data,
    isLoading,
    isError: error,
    revalidate,
  };
}

/**
 * Reply to a support ticket
 */
export async function replyToTicket(ticketId: string, message: string): Promise<void> {
  return mutate(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/reply`, 'POST', { message });
}

/**
 * Resolve a support ticket
 */
export async function resolveTicket(ticketId: string, resolution: string): Promise<void> {
  return mutate(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/resolve`, 'POST', { resolution });
}

/**
 * Mark ticket as in progress
 */
export async function markTicketInProgress(ticketId: string): Promise<void> {
  return mutate(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/in-progress`, 'POST');
}

/**
 * Reopen a support ticket
 */
export async function reopenTicket(ticketId: string): Promise<void> {
  return mutate(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/reopen`, 'POST');
}

/**
 * Update ticket priority
 */
export async function updateTicketPriority(ticketId: string, priority: string): Promise<void> {
  return mutate(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/priority`, 'POST', { priority });
}
