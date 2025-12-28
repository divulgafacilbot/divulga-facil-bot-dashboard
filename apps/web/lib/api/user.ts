/**
 * User API Client
 *
 * Client-side functions for user-related API calls
 */

export interface UserData {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  subscription: null;
  telegram: {
    linked: boolean;
  };
}

/**
 * Get current user data
 *
 * Calls GET /me endpoint with credentials (sends cookies)
 */
export async function getMe(): Promise<UserData> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

  const response = await fetch(`${apiBaseUrl}/api/me`, {
    method: 'GET',
    credentials: 'include', // Include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to load user data');
  }

  return response.json();
}

export const apiClient = {
  getMe,
};
