import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';
import * as apiClient from '../../../lib/api/user';

// Mock the API client
jest.mock('../../../lib/api/user');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard',
  }),
}));

// Mock child components
jest.mock('../../../components/dashboard/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children, user }: any) => (
    <div data-testid="dashboard-layout">
      <div data-testid="user-email">{user.email}</div>
      {children}
    </div>
  ),
}));

jest.mock('../../../components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

jest.mock('../../../components/ui/ErrorMessage', () => ({
  ErrorMessage: ({ message }: any) => <div data-testid="error-message">{message}</div>,
}));

jest.mock('../../../components/ui/Card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
}));

jest.mock('../../../components/ui/EmptyState', () => ({
  EmptyState: ({ message, action, href }: any) => (
    <div data-testid="empty-state">
      <p>{message}</p>
      {action && href && <a href={href}>{action}</a>}
    </div>
  ),
}));

describe('Dashboard Page', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    subscription: null,
    telegram: { linked: false },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (apiClient.getMe as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<DashboardPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should call getMe API on mount', () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    expect(apiClient.getMe).toHaveBeenCalledTimes(1);
  });

  it('should display user data after successful load', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });

    expect(screen.getByText(new RegExp('test@example.com', 'i'))).toBeInTheDocument();
  });

  it('should show error message when API call fails', async () => {
    (apiClient.getMe as jest.Mock).mockRejectedValue(new Error('Failed to load user data'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByText(/failed to load user data/i)).toBeInTheDocument();
  });

  it('should show error when user is not found', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(null);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByText(/usuário não encontrado/i)).toBeInTheDocument();
  });

  it('should render subscription empty state when subscription is null', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      const emptyStates = screen.getAllByTestId('empty-state');
      const subscriptionEmptyState = emptyStates.find(el =>
        el.textContent?.includes('Nenhuma assinatura ativa ainda')
      );
      expect(subscriptionEmptyState).toBeInTheDocument();
    });
  });

  it('should render telegram empty state when telegram is not linked', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      const emptyStates = screen.getAllByTestId('empty-state');
      const telegramEmptyState = emptyStates.find(el =>
        el.textContent?.includes('Telegram não conectado')
      );
      expect(telegramEmptyState).toBeInTheDocument();
    });
  });

  it('should render subscription empty state with correct action link', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      const link = screen.getByText('Ver planos');
      expect(link).toHaveAttribute('href', '/dashboard/subscription');
    });
  });

  it('should render telegram empty state with correct action link', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      const link = screen.getByText('Conectar agora');
      expect(link).toHaveAttribute('href', '/dashboard/telegram');
    });
  });

  it('should render account status card', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/status da conta/i)).toBeInTheDocument();
    });
  });

  it('should display user email in account status', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('should display user role in account status', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('USER')).toBeInTheDocument();
    });
  });

  it('should display active status correctly', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Ativo')).toBeInTheDocument();
    });
  });

  it('should display inactive status correctly', async () => {
    const inactiveUser = { ...mockUser, isActive: false };
    (apiClient.getMe as jest.Mock).mockResolvedValue(inactiveUser);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });
  });

  it('should render exactly 3 cards (status, subscription, telegram)', async () => {
    (apiClient.getMe as jest.Mock).mockResolvedValue(mockUser);

    render(<DashboardPage />);

    await waitFor(() => {
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(3);
    });
  });
});
