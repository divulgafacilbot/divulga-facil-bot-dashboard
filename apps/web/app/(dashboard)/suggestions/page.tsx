'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Filter } from 'lucide-react';
import { suggestionsApi } from '@/lib/api/suggestions';
import { Suggestion } from '@/lib/api/types/suggestions';
import { SuggestionCard } from '@/components/suggestions/SuggestionCard';
import { PAGINATION } from '@/lib/constants';

type FilterType = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IGNORED';

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState<FilterType>('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadSuggestions();
  }, [page, filter]);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = { page, limit: PAGINATION.DEFAULT_LIMIT };

      if (filter !== 'ALL') {
        if (filter === 'PENDING') {
          params.actionFilter = 'PENDING';
        } else {
          params.actionFilter = filter;
        }
      }

      const { suggestions: data, pagination } = await suggestionsApi.getSuggestions(params);
      setSuggestions(data);
      setTotalPages(pagination.totalPages);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const result = await suggestionsApi.generateSuggestions();
      alert(`${result.length} novas sugestões geradas!`);
      loadSuggestions();
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar sugestões';
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const filterButtons: { value: FilterType; label: string; color: string }[] = [
    { value: 'PENDING', label: 'Pendentes', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { value: 'ALL', label: 'Todas', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    { value: 'ACCEPTED', label: 'Aceitas', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { value: 'REJECTED', label: 'Rejeitadas', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    { value: 'IGNORED', label: 'Ignoradas', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sugestões de Produtos</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Produtos recomendados baseados nas suas preferências
          </p>
        </div>
        <button
          onClick={handleGenerateSuggestions}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={20} />
          {isGenerating ? 'Gerando...' : 'Gerar Sugestões'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={20} className="text-gray-600 dark:text-gray-400" />
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => {
              setFilter(btn.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === btn.value
                ? btn.color
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Suggestions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow h-64" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {filter === 'PENDING' ? 'Nenhuma sugestão pendente' : 'Nenhuma sugestão encontrada'}
          </p>
          {filter === 'PENDING' && (
            <button
              onClick={handleGenerateSuggestions}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Sparkles size={20} />
              Gerar Primeira Sugestão
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onUpdate={loadSuggestions}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
