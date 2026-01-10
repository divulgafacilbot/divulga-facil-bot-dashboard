'use client';

import { useState, useEffect } from 'react';
import { suggestionsApi } from '@/lib/api/suggestions';
import { SuggestionPreferences, SuggestionFrequency } from '@/lib/api/types/suggestions';

const CATEGORIES = [
  'Eletrônicos',
  'Moda',
  'Beleza',
  'Casa e Decoração',
  'Esporte e Lazer',
  'Alimentos e Bebidas',
  'Livros',
  'Brinquedos',
  'Pet',
  'Automotivo',
];

const MARKETPLACES = ['SHOPEE', 'AMAZON', 'MERCADO_LIVRE', 'ALIEXPRESS', 'MAGALU', 'AMERICANAS', 'SHEIN'];

export function SuggestionPreferencesForm() {
  const [preferences, setPreferences] = useState<SuggestionPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await suggestionsApi.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;

    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      await suggestionsApi.updatePreferences({
        suggestionsEnabled: preferences.suggestions_enabled,
        frequency: preferences.frequency,
        maxSuggestionsPerBatch: preferences.max_suggestions_per_batch,
        preferredCategories: preferences.preferred_categories,
        excludedMarketplaces: preferences.excluded_marketplaces,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar preferências');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-96" />;
  }

  if (!preferences) return null;

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Preferências de Sugestões</h2>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded">
          Preferências salvas com sucesso!
        </div>
      )}

      {/* Enable Suggestions */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.suggestions_enabled}
            onChange={(e) =>
              setPreferences({ ...preferences, suggestions_enabled: e.target.checked })
            }
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Ativar sugestões automáticas
          </span>
        </label>
      </div>

      {preferences.suggestions_enabled && (
        <>
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequência
            </label>
            <select
              value={preferences.frequency}
              onChange={(e) =>
                setPreferences({ ...preferences, frequency: e.target.value as SuggestionFrequency })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="DAILY">Diário</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensal</option>
            </select>
          </div>

          {/* Max Suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Máximo de sugestões por lote: {preferences.max_suggestions_per_batch}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={preferences.max_suggestions_per_batch}
              onChange={(e) =>
                setPreferences({ ...preferences, max_suggestions_per_batch: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>

          {/* Preferred Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categorias Preferidas
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.preferred_categories.includes(category)}
                    onChange={(e) => {
                      const newCategories = e.target.checked
                        ? [...preferences.preferred_categories, category]
                        : preferences.preferred_categories.filter((c) => c !== category);
                      setPreferences({ ...preferences, preferred_categories: newCategories });
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Excluded Marketplaces */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Marketplaces Excluídos
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MARKETPLACES.map((marketplace) => (
                <label key={marketplace} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.excluded_marketplaces.includes(marketplace)}
                    onChange={(e) => {
                      const newMarketplaces = e.target.checked
                        ? [...preferences.excluded_marketplaces, marketplace]
                        : preferences.excluded_marketplaces.filter((m) => m !== marketplace);
                      setPreferences({ ...preferences, excluded_marketplaces: newMarketplaces });
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{marketplace}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Salvando...' : 'Salvar Preferências'}
      </button>
    </form>
  );
}
