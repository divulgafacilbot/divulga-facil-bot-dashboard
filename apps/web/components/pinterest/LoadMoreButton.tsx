'use client';

import { useState } from 'react';

interface LoadMoreButtonProps {
  onClick: () => Promise<void> | void;
  hasMore: boolean;
  isLoading?: boolean;
}

export function LoadMoreButton({ onClick, hasMore, isLoading = false }: LoadMoreButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onClick();
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!hasMore) {
    return null;
  }

  return (
    <div className="flex justify-center mt-8">
      <button
        onClick={handleClick}
        disabled={loading || isLoading}
        className="px-8 py-3 bg-pink-600 text-white font-medium rounded-md hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
      >
        {loading || isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Carregando...
          </span>
        ) : (
          'Carregar mais produtos'
        )}
      </button>
    </div>
  );
}
