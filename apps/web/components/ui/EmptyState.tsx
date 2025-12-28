/**
 * EmptyState Component
 *
 * Displays empty state message with optional CTA
 */

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  message: string;
  action?: string;
  href?: string;
}

export function EmptyState({ message, action, href }: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      <p className="text-gray-500 mb-4">{message}</p>
      {action && href && (
        <Link
          href={href}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded inline-block hover:opacity-90 transition-opacity"
        >
          {action}
        </Link>
      )}
    </div>
  );
}
