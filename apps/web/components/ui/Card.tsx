/**
 * Card Component
 *
 * Reusable card container using design tokens from design-base.css
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border)]
                  rounded-[var(--radius-md)] p-[var(--spacing-lg)]
                  shadow-[var(--shadow-sm)] ${className}`}
    >
      {children}
    </div>
  );
}
