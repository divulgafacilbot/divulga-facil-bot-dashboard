import React from 'react';
import { render } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should center the spinner on the screen', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('justify-center');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('min-h-screen');
  });

  it('should render spinner with primary color', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('border-[var(--color-primary)]');
  });

  it('should have rounded-full class for circular shape', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');

    expect(spinner).toHaveClass('rounded-full');
  });

  it('should have correct size classes', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');

    expect(spinner).toHaveClass('h-12');
    expect(spinner).toHaveClass('w-12');
  });

  it('should have animate-spin class for rotation', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');

    expect(spinner).toBeInTheDocument();
  });

  it('should have border styling', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');

    expect(spinner).toHaveClass('border-t-2');
    expect(spinner).toHaveClass('border-b-2');
  });
});
