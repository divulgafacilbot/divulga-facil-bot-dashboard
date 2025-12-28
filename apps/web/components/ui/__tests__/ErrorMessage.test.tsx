import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage Component', () => {
  it('should render error message', () => {
    render(<ErrorMessage message="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should have error styling (red background)', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    const errorDiv = container.firstChild as HTMLElement;

    expect(errorDiv).toHaveClass('bg-red-50');
  });

  it('should have red border', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    const errorDiv = container.firstChild as HTMLElement;

    expect(errorDiv).toHaveClass('border');
    expect(errorDiv).toHaveClass('border-red-200');
  });

  it('should have red text color', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    const errorDiv = container.firstChild as HTMLElement;

    expect(errorDiv).toHaveClass('text-red-800');
  });

  it('should have padding', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    const errorDiv = container.firstChild as HTMLElement;

    expect(errorDiv).toHaveClass('p-4');
  });

  it('should have rounded corners', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    const errorDiv = container.firstChild as HTMLElement;

    expect(errorDiv).toHaveClass('rounded');
  });

  it('should render different error messages correctly', () => {
    const { rerender } = render(<ErrorMessage message="First error" />);
    expect(screen.getByText('First error')).toBeInTheDocument();

    rerender(<ErrorMessage message="Second error" />);
    expect(screen.getByText('Second error')).toBeInTheDocument();
    expect(screen.queryByText('First error')).not.toBeInTheDocument();
  });

  it('should handle empty message gracefully', () => {
    const { container } = render(<ErrorMessage message="" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
