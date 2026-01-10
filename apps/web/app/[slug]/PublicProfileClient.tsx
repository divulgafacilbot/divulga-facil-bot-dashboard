'use client';

import { useState, useMemo, useEffect } from 'react';
import { PublicHeader } from '@/components/pinterest/PublicHeader';
import { PublicCardGrid } from '@/components/pinterest/PublicCardGrid';
import { PublicFilters } from '@/components/pinterest/PublicFilters';
import { PublicFooter } from '@/components/pinterest/PublicFooter';
import { LoadMoreButton } from '@/components/pinterest/LoadMoreButton';
import { trackProfileView } from '@/lib/tracking/events';

interface Card {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  price: string;
  original_price?: string | null;
  image_url: string;
  marketplace: string;
  category?: string | null;
  coupon?: string | null;
  source: string;
}

interface PageSettings {
  displayName: string;
  headerColor: string;
  titleColor?: string | null;
  headerImageUrl?: string | null;
  logoUrl?: string | null;
  bio?: string | null;
}

interface PublicProfileClientProps {
  slug: string;
  pageSettings: PageSettings;
  initialCards: Card[];
  hasMore: boolean;
  marketplaces: string[];
  categories: string[];
}

export function PublicProfileClient({
  slug,
  pageSettings,
  initialCards,
  hasMore: initialHasMore,
  marketplaces,
  categories
}: PublicProfileClientProps) {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Track profile view on mount
  useEffect(() => {
    trackProfileView(slug);
  }, [slug]);

  // Filter cards based on selected filters
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (selectedMarketplace && card.marketplace !== selectedMarketplace) {
        return false;
      }
      if (selectedCategory && card.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [cards, selectedMarketplace, selectedCategory]);

  // Load more cards
  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const nextPage = page + 1;
      const res = await fetch(`${apiUrl}/${slug}?page=${nextPage}`);

      if (res.ok) {
        const data = await res.json();
        setCards((prev) => [...prev, ...data.cards.items]);
        setHasMore(data.cards.hasMore);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if we should show "Load More" based on filters
  const showLoadMore = hasMore && !selectedMarketplace && !selectedCategory;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PublicHeader settings={pageSettings} />

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Filters Sidebar - Fixed Left */}
        <div className="hidden lg:block w-64 flex-shrink-0 bg-white border-r border-gray-200">
          <div className="fixed top-[72px] w-64 p-4 pt-[100px] h-[calc(100vh-72px)] overflow-y-auto bg-white border-r border-gray-200">
            <PublicFilters
              marketplaces={marketplaces}
              categories={categories}
              selectedMarketplace={selectedMarketplace}
              selectedCategory={selectedCategory}
              onMarketplaceChange={setSelectedMarketplace}
              onCategoryChange={setSelectedCategory}
            />
          </div>
        </div>

        {/* Mobile Filter Button */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <PublicFilters
            marketplaces={marketplaces}
            categories={categories}
            selectedMarketplace={selectedMarketplace}
            selectedCategory={selectedCategory}
            onMarketplaceChange={setSelectedMarketplace}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        {/* Cards Grid */}
        <div className="flex-1 px-4 lg:px-8 py-8">
            {/* Results count */}
            {(selectedMarketplace || selectedCategory) && (
              <p className="text-sm text-gray-600 mb-4">
                {filteredCards.length} produto{filteredCards.length !== 1 ? 's' : ''} encontrado{filteredCards.length !== 1 ? 's' : ''}
              </p>
            )}

            <PublicCardGrid cards={filteredCards} slug={slug} />

            {/* Load More Button */}
            {showLoadMore && (
              <div className="mt-8 text-center">
                <LoadMoreButton
                  onClick={handleLoadMore}
                  isLoading={isLoading}
                  hasMore={hasMore}
                />
              </div>
            )}

            {/* No results message when filtering */}
            {filteredCards.length === 0 && (selectedMarketplace || selectedCategory) && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Nenhum produto encontrado com os filtros selecionados.
                </p>
                <button
                  onClick={() => {
                    setSelectedMarketplace(null);
                    setSelectedCategory(null);
                  }}
                  className="mt-4 text-pink-600 hover:text-pink-700 font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            )}
        </div>
      </main>

      {/* Footer */}
      <PublicFooter displayName={pageSettings.displayName} />
    </div>
  );
}
