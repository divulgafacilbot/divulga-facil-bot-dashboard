import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card Component', () => {
  it('should render children content', () => {
    render(
      <Card>
        <p>Test content</p>
      </Card>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should apply default classes', () => {
    const { container } = render(
      <Card>
        <p>Content</p>
      </Card>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-[var(--color-surface)]');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('border-[var(--color-border)]');
    expect(card).toHaveClass('rounded-[var(--radius-md)]');
    expect(card).toHaveClass('p-[var(--spacing-lg)]');
  });

  it('should merge custom className with default classes', () => {
    const { container } = render(
      <Card className="custom-class">
        <p>Content</p>
      </Card>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-[var(--color-surface)]');
    expect(card).toHaveClass('custom-class');
  });

  it('should render as a div element', () => {
    const { container } = render(
      <Card>
        <p>Content</p>
      </Card>
    );

    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('should handle nested components', () => {
    render(
      <Card>
        <h2>Title</h2>
        <p>Description</p>
        <button>Action</button>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});
