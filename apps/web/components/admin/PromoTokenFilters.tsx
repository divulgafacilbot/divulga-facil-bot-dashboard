'use client';

import type { BotType } from '../../lib/admin-enums';
import { BOT_TYPE_LABELS } from '../../lib/admin-enums';

interface PromoTokenFiltersProps {
  filters: {
    botType?: BotType;
    search?: string;
  };
  onFilterChange: (filters: { botType?: BotType; search?: string }) => void;
}

export default function PromoTokenFilters({ filters, onFilterChange }: PromoTokenFiltersProps) {
  const handleBotTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as BotType | '';
    onFilterChange({
      ...filters,
      botType: value || undefined,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFilterChange({
      ...filters,
      search: value || undefined,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = !!filters.botType || !!filters.search;

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
      <div className="flex items-center gap-4 flex-wrap">
        <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-0">Pesquisa:</h3>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            id="search-filter"
            value={filters.search || ''}
            onChange={handleSearchChange}
            placeholder="Pesquisar por nome ou email..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] min-w-[250px]"
          />
        </div>

        {/* Bot Type Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="bot-type-filter" className="text-sm font-semibold text-[var(--color-text-main)] mb-0">
            Tipo de Bot:
          </label>
          <select
            id="bot-type-filter"
            value={filters.botType || ''}
            onChange={handleBotTypeChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
          >
            <option value="">Todos</option>
            <option value="PROMOCOES">{BOT_TYPE_LABELS.PROMOCOES}</option>
            <option value="DOWNLOAD">{BOT_TYPE_LABELS.DOWNLOAD}</option>
            <option value="PINTEREST">{BOT_TYPE_LABELS.PINTEREST}</option>
            <option value="SUGGESTION">{BOT_TYPE_LABELS.SUGGESTION}</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm font-semibold text-[var(--color-secondary)] border border-[var(--color-secondary)] rounded-lg hover:bg-[var(--color-secondary)] hover:text-white transition-colors"
          >
            Limpar Filtros
          </button>
        )}
      </div>
    </div>
  );
}
