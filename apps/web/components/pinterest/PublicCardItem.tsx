'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MarketplaceBadge } from './MarketplaceBadge';
import { trackCardClick, trackCTAClick } from '@/lib/tracking/events';

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

interface PublicCardItemProps {
  card: Card;
  slug: string;
}

export function PublicCardItem({ card, slug }: PublicCardItemProps) {
  const handleCardClick = () => {
    trackCardClick(slug, card.slug);
  };

  const handleCTAClick = (e: React.MouseEvent) => {
    // Prevent the card link from being triggered
    e.preventDefault();
    e.stopPropagation();

    // Track the CTA click
    trackCTAClick(slug, card.slug);

    // Navigate to the redirect URL (opens in new tab)
    window.open(`/r/${slug}/${card.slug}`, '_blank', 'noopener,noreferrer');
  };

  // Determine card class based on source (BOT = pinterest-bot-card, MANUAL = pinterest-manual-card)
  const cardSourceClass = card.source === 'BOT' ? 'pinterest-bot-card' : 'pinterest-manual-card';
  const isExternalImage = card.image_url.startsWith('http');

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden flex flex-col min-h-[350px] ${cardSourceClass}`}>
      {/* Clickable area for card details */}
      <Link
        href={`/${slug}/${card.slug}`}
        onClick={handleCardClick}
        className="block flex-1"
      >
        {/* Image */}
        <div className="relative aspect-square">
          {isExternalImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_url}
              alt={card.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Image
              src={card.image_url}
              alt={card.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute bottom-0 right-2 z-10">
            <MarketplaceBadge marketplace={card.marketplace} size="sm" />
          </div>
        </div>

        {/* Content */}
        <div className="p-3 pb-1">
          <h3 className="font-semibold text-sm mb-1 line-clamp-2">
            {card.title}
          </h3>

          {card.description && (
            <p className="text-gray-600 text-xs mb-2 line-clamp-2">
              {card.description}
            </p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-green-600">{card.price}</span>
            {card.original_price && (
              <span className="text-xs text-gray-400 line-through">
                {card.original_price}
              </span>
            )}
          </div>

          {/* Coupon */}
          {card.coupon && (
            <div className="mb-2 p-1.5 bg-yellow-50 border border-yellow-200 rounded text-center">
              <span className="text-[10px] text-gray-600">Cupom:</span>
              <span className="ml-1 font-mono font-bold text-yellow-800 text-xs">
                {card.coupon}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* CTA Button - Outside the Link, goes directly to marketplace */}
      <div className="px-3 pt-1 pb-3 mt-auto">
        <button
          onClick={handleCTAClick}
          className="w-full bg-pink-600 text-white py-1.5 text-sm rounded-md hover:bg-pink-700 transition-colors font-medium"
        >
          Pegar promoção
        </button>
      </div>
    </div>
  );
}
