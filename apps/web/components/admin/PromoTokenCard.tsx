'use client';

import { useState } from 'react';
import type { PromoToken } from '../../types/promo-token.types';
import { BOT_TYPE_LABELS } from '../../lib/admin-enums';

interface PromoTokenCardProps {
  token: PromoToken;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
}

const BOT_TYPE_COLORS: Record<string, string> = {
  ARTS: 'bg-red-100 text-red-700 border-red-300',
  DOWNLOAD: 'bg-blue-100 text-blue-700 border-blue-300',
  PINTEREST: 'bg-pink-100 text-pink-700 border-pink-300',
  SUGGESTION: 'bg-purple-100 text-purple-700 border-purple-300',
};

export default function PromoTokenCard({ token, onRotate, onDelete }: PromoTokenCardProps) {
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy token:', error);
    }
  };

  const isExpired = token.expiresAt
    ? new Date(token.expiresAt) < new Date()
    : false;

  const formatValidity = () => {
    if (!token.expiresAt) {
      return <span className="text-green-600 font-medium">Permanente</span>;
    }
    const date = new Date(token.expiresAt).toLocaleDateString('pt-BR');
    if (isExpired) {
      return <span className="text-red-600 font-medium">{date} (Expirado)</span>;
    }
    return <span className="text-gray-700">{date}</span>;
  };

  return (
    <div
      className="bg-white rounded-lg border border-[var(--color-border)] px-4 py-3 hover:shadow-sm transition-shadow"
      role="article"
      aria-label={`Token promocional: ${token.name}`}
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* Bot Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
            BOT_TYPE_COLORS[token.botType] || 'bg-gray-100 text-gray-700 border-gray-300'
          }`}
        >
          {BOT_TYPE_LABELS[token.botType] || token.botType}
        </span>

        {/* Name */}
        <span className="font-semibold text-[var(--color-text-main)] min-w-[120px]">
          {token.name}
        </span>

        {/* Recipient */}
        <span className="text-sm text-[var(--color-text-secondary)] min-w-[180px]">
          {token.userEmail || 'N/A'}
        </span>

        {/* Validity */}
        <span className="text-sm min-w-[120px]">
          {formatValidity()}
        </span>

        {/* Token Display */}
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 min-w-[200px] max-w-[280px] truncate">
          {showToken ? token.token : '••••••••••••••••••••••••••••••••'}
        </span>

        {/* Inactive badge */}
        {!token.isActive && (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
            Inativo
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons - Icons only */}
        <div className="flex items-center gap-2">
          {/* Show/Hide Token Button */}
          <button
            onClick={() => setShowToken(!showToken)}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
            title={showToken ? 'Ocultar token' : 'Mostrar token'}
          >
            {showToken ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopyToken}
            className={`p-2 rounded-lg transition-colors ${
              copied
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Copiar token"
            title="Copiar token"
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* Rotate Button */}
          <button
            onClick={() => onRotate(token.id)}
            className="p-2 rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!token.isActive}
            aria-label="Rotacionar token"
            title="Rotacionar token"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(token.id)}
            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            aria-label="Deletar token"
            title="Deletar token"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toast notification for copy success */}
      {copied && (
        <div
          className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50"
          role="alert"
        >
          Token copiado com sucesso!
        </div>
      )}
    </div>
  );
}
