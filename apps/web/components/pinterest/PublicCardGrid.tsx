'use client';

import { PublicCardItem } from './PublicCardItem';

interface Card {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  price: string;
  original_price?: string | null;
  image_url: string;
  marketplace: string;
  coupon?: string | null;
  source: string;
}

interface PublicCardGridProps {
  cards: Card[];
  slug: string;
}

export function PublicCardGrid({ cards, slug }: PublicCardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center w-full min-h-[300px] py-12">
        <p className="text-gray-500 text-lg text-center">Nenhum produto disponível no momento.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {cards.map((card) => (
        <PublicCardItem key={card.id} card={card} slug={slug} />
      ))}
    </div>
  );
}
