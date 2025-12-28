/**
 * ErrorMessage Component
 *
 * Displays error messages with consistent styling
 */

import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
      {message}
    </div>
  );
}
