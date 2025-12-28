import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState Component', () => {
  it('should render message', () => {
    render(<EmptyState message="No data available" />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should not render action button when action and href are not provided', () => {
    render(<EmptyState message="Empty state" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should render action button when action and href are provided', () => {
    render(
      <EmptyState
        message="No subscription"
        action="Ver planos"
        href="/dashboard/subscription"
      />
    );

    const link = screen.getByRole('link', { name: 'Ver planos' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard/subscription');
  });

  it('should apply primary color to action button', () => {
    render(
      <EmptyState
        message="No telegram"
        action="Conectar"
        href="/dashboard/telegram"
      />
    );

    const link = screen.getByRole('link', { name: 'Conectar' });
    expect(link).toHaveClass('bg-[var(--color-primary)]');
  });

  it('should not render action button when only action is provided (no href)', () => {
    render(<EmptyState message="Empty" action="Action without link" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should not render action button when only href is provided (no action)', () => {
    render(<EmptyState message="Empty" href="/some-path" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should center the content', () => {
    const { container } = render(<EmptyState message="Centered" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('text-center');
  });

  it('should apply correct styling to message', () => {
    render(<EmptyState message="Styled message" />);

    const message = screen.getByText('Styled message');
    expect(message).toHaveClass('text-gray-500');
  });
});
