import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardLayout from '../DashboardLayout';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
}));

describe('DashboardLayout Component', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER' as const,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    subscription: null,
    telegram: { linked: false },
  };

  it('should render children content', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('should render sidebar with user email', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should render sidebar with user role', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('USER')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /assinatura/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /telegram/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /branding/i })).toBeInTheDocument();
  });

  it('should render logout button', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
  });

  it('should use design tokens for background', () => {
    const { container } = render(
      <DashboardLayout user={mockUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    const mainWrapper = container.firstChild as HTMLElement;
    expect(mainWrapper).toHaveClass('bg-[var(--color-background)]');
  });

  it('should have flex layout for sidebar and main content', () => {
    const { container } = render(
      <DashboardLayout user={mockUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    const mainWrapper = container.firstChild as HTMLElement;
    expect(mainWrapper).toHaveClass('flex');
    expect(mainWrapper).toHaveClass('min-h-screen');
  });

  it('should render sidebar with correct width', () => {
    const { container } = render(
      <DashboardLayout user={mockUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('w-60');
  });

  it('should render main content area with padding', () => {
    const { container } = render(
      <DashboardLayout user={mockUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    const main = container.querySelector('main');
    expect(main).toHaveClass('p-8');
    expect(main).toHaveClass('flex-1');
  });

  it('should render admin role correctly', () => {
    const adminUser = { ...mockUser, role: 'ADMIN' as const };

    render(
      <DashboardLayout user={adminUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('should navigate to correct paths for each link', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByRole('link', { name: /início/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /assinatura/i })).toHaveAttribute('href', '/dashboard/subscription');
    expect(screen.getByRole('link', { name: /telegram/i })).toHaveAttribute('href', '/dashboard/telegram');
    expect(screen.getByRole('link', { name: /branding/i })).toHaveAttribute('href', '/dashboard/branding');
  });
});
