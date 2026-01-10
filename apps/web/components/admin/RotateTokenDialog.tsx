'use client';

import { useState, useEffect, useRef } from 'react';

interface RotateTokenDialogProps {
  isOpen: boolean;
  tokenName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function RotateTokenDialog({
  isOpen,
  tokenName,
  onConfirm,
  onCancel,
}: RotateTokenDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus the dialog when it opens
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rotate-dialog-title"
      >
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <svg
            className="h-8 w-8 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        {/* Title */}
        <h2
          id="rotate-dialog-title"
          className="mb-2 text-center text-xl font-bold text-[var(--color-text-main)]"
        >
          Rotacionar Token
        </h2>

        {/* Description */}
        <p className="mb-6 text-center text-sm text-[var(--color-text-secondary)]">
          Você está prestes a rotacionar o token <strong>&quot;{tokenName}&quot;</strong>.
          <br />
          <br />
          Esta ação irá:
        </p>

        {/* Info list */}
        <ul className="mb-6 space-y-2 text-sm text-[var(--color-text-secondary)]">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-yellow-600">⚠️</span>
            <span>Invalidar o token atual imediatamente</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600">✓</span>
            <span>Gerar um novo token com as mesmas configurações</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-600">ℹ️</span>
            <span>Usuários usando o token antigo precisarão atualizar</span>
          </li>
        </ul>

        {/* Warning box */}
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700 font-medium">
            Esta ação não pode ser desfeita. Certifique-se de que deseja continuar.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-xl border-2 border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
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
                Rotacionando...
              </span>
            ) : (
              'Rotacionar Token'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
