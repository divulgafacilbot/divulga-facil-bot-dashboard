'use client';

import { useState } from 'react';
import { Suggestion } from '@/lib/api/types/suggestions';
import { suggestionsApi } from '@/lib/api/suggestions';
import { ExternalLink, ThumbsUp, ThumbsDown, X } from 'lucide-react';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onUpdate?: () => void;
}

export function SuggestionCard({ suggestion, onUpdate }: SuggestionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'ACCEPTED' | 'REJECTED' | 'IGNORED') => {
    if (suggestion.user_action) return; // Already acted upon

    setIsProcessing(true);
    try {
      await suggestionsApi.recordAction(suggestion.id, action);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to record action:', error);
      alert('Erro ao registrar ação');
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionBadge = () => {
    if (!suggestion.user_action) return null;

    const config = {
      ACCEPTED: { label: 'Aceito', className: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' },
      REJECTED: { label: 'Rejeitado', className: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' },
      IGNORED: { label: 'Ignorado', className: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' },
    };

    const { label, className } = config[suggestion.user_action];

    return (
      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${className}`}>
        {label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-all hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
              {suggestion.suggested_category}
            </span>
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
              {suggestion.suggested_marketplace}
            </span>
            {suggestion.score !== undefined && suggestion.score !== null && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                {Math.round(suggestion.score * 100)}% relevância
              </span>
            )}
          </div>
        </div>
        {getActionBadge()}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2">
        {suggestion.suggested_title}
      </h3>

      {/* Date */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Sugerido em {formatDate(suggestion.suggested_at)}
      </p>

      {/* Actions */}
      {!suggestion.user_action ? (
        <div className="flex items-center gap-2">
          <a
            href={suggestion.suggested_product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            <ExternalLink size={14} />
            Ver Produto
          </a>
          <button
            onClick={() => handleAction('ACCEPTED')}
            disabled={isProcessing}
            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
            title="Aceitar"
          >
            <ThumbsUp size={18} />
          </button>
          <button
            onClick={() => handleAction('REJECTED')}
            disabled={isProcessing}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
            title="Rejeitar"
          >
            <ThumbsDown size={18} />
          </button>
          <button
            onClick={() => handleAction('IGNORED')}
            disabled={isProcessing}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Ignorar"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <a
            href={suggestion.suggested_product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            <ExternalLink size={14} />
            Ver Produto
          </a>
        </div>
      )}
    </div>
  );
}
