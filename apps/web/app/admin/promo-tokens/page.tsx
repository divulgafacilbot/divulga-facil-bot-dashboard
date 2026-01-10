'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePromoTokens, createPromoToken, deletePromoToken, rotatePromoToken } from '../../../lib/api/promo-tokens';
import PromoTokenCard from '../../../components/admin/PromoTokenCard';
import PromoTokenFilters from '../../../components/admin/PromoTokenFilters';
import CreatePromoTokenModal from '../../../components/admin/CreatePromoTokenModal';
import RotateTokenDialog from '../../../components/admin/RotateTokenDialog';
import type { BotType } from '../../../lib/admin-enums';
import type { CreatePromoTokenInput, PromoToken } from '../../../types/promo-token.types';

export default function PromoTokensPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{ botType?: BotType; search?: string }>({});
  const [page, setPage] = useState(1);
  const [rotateDialogToken, setRotateDialogToken] = useState<PromoToken | null>(null);
  const limit = 20;

  const { tokens: allTokens, pagination, isLoading, isError, revalidate } = usePromoTokens({
    botType: filters.botType,
    page,
    limit,
  });

  // Client-side search filtering
  const tokens = filters.search
    ? allTokens.filter((token) => {
        const searchLower = filters.search!.toLowerCase();
        const nameMatch = token.name.toLowerCase().includes(searchLower);
        const emailMatch = token.userEmail?.toLowerCase().includes(searchLower) || false;
        return nameMatch || emailMatch;
      })
    : allTokens;

  const handleCreateToken = async (input: CreatePromoTokenInput) => {
    try {
      await createPromoToken(input);
      // Force revalidation of the tokens list
      await revalidate();
      alert('Token criado com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar token';
      throw new Error(errorMessage);
    }
  };

  const handleRotateToken = (id: string) => {
    const token = tokens.find((t) => t.id === id);
    if (token) {
      setRotateDialogToken(token);
    }
  };

  const confirmRotateToken = async () => {
    if (!rotateDialogToken) return;

    try {
      await rotatePromoToken(rotateDialogToken.id);
      revalidate();
      alert('Token rotacionado com sucesso!');
      setRotateDialogToken(null);
    } catch (error) {
      alert('Erro ao rotacionar token');
    }
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este token? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await deletePromoToken(id);
      revalidate();
      alert('Token deletado com sucesso!');
    } catch (error) {
      alert('Erro ao deletar token');
    }
  };

  if (isError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700 font-semibold">Erro ao carregar tokens promocionais.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-main)] mb-2">
          Gerenciamento de Tokens Promocionais
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Crie e gerencie tokens promocionais para os bots
        </p>
      </div>

      {/* Create Token Button */}
      <div className="mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-[var(--color-secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          + Criar Token
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <PromoTokenFilters filters={filters} onFilterChange={setFilters} />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-secondary)]">Carregando tokens...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tokens.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-[var(--color-border)]">
          <p className="text-[var(--color-text-secondary)] text-lg mb-4">
            Nenhum token criado ainda.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-[var(--color-secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Criar Primeiro Token
          </button>
        </div>
      )}

      {/* Tokens List */}
      {!isLoading && tokens.length > 0 && (
        <>
          <div className="flex flex-col gap-2 mb-8">
            {tokens.map((token) => (
              <PromoTokenCard
                key={token.id}
                token={token}
                onRotate={handleRotateToken}
                onDelete={handleDeleteToken}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-4 items-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="text-sm text-[var(--color-text-secondary)]">
                Página {page} de {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <CreatePromoTokenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateToken}
      />

      {/* Rotate Token Dialog */}
      <RotateTokenDialog
        isOpen={!!rotateDialogToken}
        tokenName={rotateDialogToken?.name || ''}
        onConfirm={confirmRotateToken}
        onCancel={() => setRotateDialogToken(null)}
      />
    </div>
  );
}
