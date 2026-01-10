'use client';

import { trackCTAClick } from '@/lib/tracking/events';

interface CTAButtonProps {
  slug: string;
  cardSlug: string;
  marketplace: string;
  variant?: 'primary' | 'secondary';
  children?: React.ReactNode;
}

export function CTAButton({
  slug,
  cardSlug,
  marketplace,
  variant = 'primary',
  children
}: CTAButtonProps) {
  const handleClick = () => {
    trackCTAClick(slug, cardSlug);
  };

  const baseClasses = 'block w-full text-center py-3 rounded-md font-semibold transition-colors shadow-md hover:shadow-lg';

  const variantClasses = {
    primary: 'bg-pink-600 text-white hover:bg-pink-700',
    secondary: 'bg-white text-pink-600 border-2 border-pink-600 hover:bg-pink-50'
  };

  const defaultLabel = 'Pegar promoção';

  return (
    <a
      href={`/r/${slug}/${cardSlug}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children || defaultLabel}
    </a>
  );
}
