import Image from 'next/image';

interface MarketplaceBadgeProps {
  marketplace: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const MARKETPLACE_IMAGES: Record<string, string> = {
  MERCADO_LIVRE: '/miniaturas/miniatura-meli.png',
  SHOPEE: '/miniaturas/miniatura-shopee.png',
  AMAZON: '/miniaturas/miniatura-amazon.png',
  MAGALU: '/miniaturas/miniatura-magalu.png'
};

const MARKETPLACE_LABELS: Record<string, string> = {
  MERCADO_LIVRE: 'Mercado Livre',
  SHOPEE: 'Shopee',
  AMAZON: 'Amazon',
  MAGALU: 'Magalu'
};

// Size config: 4x larger than original
const SIZE_CONFIG = {
  sm: { container: 'w-24 h-24', image: 96 },
  md: { container: 'w-32 h-32', image: 128 },
  lg: { container: 'w-40 h-40', image: 160 }
};

export function MarketplaceBadge({ marketplace, size = 'md', showLabel = false }: MarketplaceBadgeProps) {
  const imageSrc = MARKETPLACE_IMAGES[marketplace];
  const label = MARKETPLACE_LABELS[marketplace] || marketplace.replace(/_/g, ' ');
  const sizeConfig = SIZE_CONFIG[size];

  // If no image found, fallback to text badge
  if (!imageSrc) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm bg-gray-100 text-gray-800">
        {label}
      </span>
    );
  }

  return (
    <div
      className="inline-flex items-center"
      title={label}
    >
      {/* No border, no background - transparent PNG */}
      <div className={`relative ${sizeConfig.container}`}>
        <Image
          src={imageSrc}
          alt={label}
          width={sizeConfig.image}
          height={sizeConfig.image}
          className="object-contain absolute bottom-0 right-0"
        />
      </div>
      {showLabel && (
        <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>
      )}
    </div>
  );
}
