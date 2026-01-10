'use client';

import { useState } from 'react';

interface PublicFiltersProps {
  marketplaces: string[];
  categories: string[];
  selectedMarketplace: string | null;
  selectedCategory: string | null;
  onMarketplaceChange: (marketplace: string | null) => void;
  onCategoryChange: (category: string | null) => void;
}

const MARKETPLACE_LABELS: Record<string, string> = {
  MERCADO_LIVRE: 'Mercado Livre',
  SHOPEE: 'Shopee',
  AMAZON: 'Amazon',
  MAGALU: 'Magalu'
};

export function PublicFilters({
  marketplaces,
  categories,
  selectedMarketplace,
  selectedCategory,
  onMarketplaceChange,
  onCategoryChange
}: PublicFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasFilters = !!selectedMarketplace;
  const hasContent = marketplaces.length > 0;

  const clearFilters = () => {
    onMarketplaceChange(null);
    onCategoryChange(null);
  };

  return (
    <>
      {/* Mobile Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden flex items-center gap-2 px-4 py-3 bg-pink-500 text-white rounded-full shadow-lg text-sm font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {selectedMarketplace && (
          <span className="bg-white text-pink-500 text-xs px-2 py-0.5 rounded-full font-bold">
            1
          </span>
        )}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <FilterContent
              marketplaces={marketplaces}
              categories={categories}
              selectedMarketplace={selectedMarketplace}
              selectedCategory={selectedCategory}
              onMarketplaceChange={(m) => { onMarketplaceChange(m); setIsOpen(false); }}
              onCategoryChange={(c) => { onCategoryChange(c); setIsOpen(false); }}
              hasFilters={hasFilters}
              hasContent={hasContent}
              clearFilters={clearFilters}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar Content */}
      <div className="hidden lg:block">
        <FilterContent
          marketplaces={marketplaces}
          categories={categories}
          selectedMarketplace={selectedMarketplace}
          selectedCategory={selectedCategory}
          onMarketplaceChange={onMarketplaceChange}
          onCategoryChange={onCategoryChange}
          hasFilters={hasFilters}
          hasContent={hasContent}
          clearFilters={clearFilters}
        />
      </div>
    </>
  );
}

function FilterContent({
  marketplaces,
  categories,
  selectedMarketplace,
  selectedCategory,
  onMarketplaceChange,
  onCategoryChange,
  hasFilters,
  hasContent,
  clearFilters
}: {
  marketplaces: string[];
  categories: string[];
  selectedMarketplace: string | null;
  selectedCategory: string | null;
  onMarketplaceChange: (marketplace: string | null) => void;
  onCategoryChange: (category: string | null) => void;
  hasFilters: boolean;
  hasContent: boolean;
  clearFilters: () => void;
}) {
  return (
    <>
      {/* Title */}
      <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
        Filtros
      </h2>

      {/* Marketplace Filter */}
      {marketplaces.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
            Marketplace
          </h3>
          <div className="space-y-1">
            {marketplaces.map((marketplace) => (
              <button
                key={marketplace}
                onClick={() => onMarketplaceChange(selectedMarketplace === marketplace ? null : marketplace)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                  ${selectedMarketplace === marketplace
                    ? 'bg-pink-100 text-pink-700 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                  }
                `}
              >
                {MARKETPLACE_LABELS[marketplace] || marketplace.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="w-full mb-4 text-sm text-pink-600 hover:text-pink-700 font-medium text-left"
        >
          ✕ Limpar filtros
        </button>
      )}

      {/* Empty State */}
      {!hasContent && (
        <div className="text-center py-6">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <p className="text-sm text-gray-400">
            Nenhum filtro disponível
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Adicione produtos para ver os filtros
          </p>
        </div>
      )}
    </>
  );
}
