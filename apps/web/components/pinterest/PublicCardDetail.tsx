'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { MarketplaceBadge } from './MarketplaceBadge';
import { CTAButton } from './CTAButton';
import { trackCardView } from '@/lib/tracking/events';

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

interface PublicCardDetailProps {
  card: Card;
  slug: string;
}

export function PublicCardDetail({ card, slug }: PublicCardDetailProps) {
  // Track card view on mount
  useEffect(() => {
    trackCardView(slug, card.slug);
  }, [slug, card.slug]);

  // Determine card class based on source (BOT = pinterest-bot-card, MANUAL = pinterest-manual-card)
  const cardSourceClass = card.source === 'BOT' ? 'pinterest-bot-card' : 'pinterest-manual-card';
  const isExternalImage = card.image_url.startsWith('http');

  return (
    <div className={`max-w-[80%] mx-auto bg-white rounded-lg shadow-lg overflow-hidden ${cardSourceClass}`}>
      <div className="md:flex">
        {/* Image */}
        <div className="md:w-1/2 relative min-h-[400px]">
          {isExternalImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_url}
              alt={card.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <Image
              src={card.image_url}
              alt={card.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          )}
          <div className="absolute bottom-4 right-4 z-10">
            <MarketplaceBadge marketplace={card.marketplace} size="md" />
          </div>
        </div>

        {/* Details */}
        <div className="md:w-1/2 p-8">
          <h1 className="text-3xl font-bold mb-4">{card.title}</h1>

          {card.description && (
            <p className="text-gray-600 mb-6 leading-relaxed">{card.description}</p>
          )}

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-4 mb-2">
              <span className="text-4xl font-bold text-green-600">{card.price}</span>
              {card.original_price && (
                <span className="text-xl text-gray-400 line-through">
                  {card.original_price}
                </span>
              )}
            </div>
            {card.original_price && (
              <div className="text-sm text-green-600 font-medium">
                Economia disponível!
              </div>
            )}
          </div>

          {/* Coupon */}
          {card.coupon && (
            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-md">
              <div className="text-sm text-gray-600 mb-1">Cupom de desconto:</div>
              <div className="flex items-center justify-between">
                <div className="text-xl font-mono font-bold text-yellow-800">
                  {card.coupon}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(card.coupon!);
                    alert('Cupom copiado!');
                  }}
                  className="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-3 py-1 rounded transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          {/* CTA Button */}
          <div className="space-y-2">
            <CTAButton
              slug={slug}
              cardSlug={card.slug}
              marketplace={card.marketplace}
            />
            <div className="text-xs text-gray-500 text-center">
              Você será redirecionado para o site oficial
            </div>
          </div>

          {/* Source Badge */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Origem: {card.source === 'BOT' ? 'Automático' : 'Manual'}</span>
              <span>Marketplace: {card.marketplace.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
