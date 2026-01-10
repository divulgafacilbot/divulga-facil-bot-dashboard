'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MarketplaceProduct } from '@/lib/api/types/marketplace';
import { marketplaceApi } from '@/lib/api/marketplace';
import { Eye, MousePointerClick, ExternalLink, Edit, Trash2, Star } from 'lucide-react';

interface ProductCardProps {
  product: MarketplaceProduct;
  onEdit?: (product: MarketplaceProduct) => void;
  onDelete?: (productId: string) => void;
  onUpdate?: () => void;
}

export function ProductCard({ product, onEdit, onDelete, onUpdate }: ProductCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este produto?')) return;

    setIsDeleting(true);
    try {
      await marketplaceApi.deleteProduct(product.id);
      onDelete?.(product.id);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Erro ao deletar produto');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClick = () => {
    marketplaceApi.trackClick(product.id).catch(console.error);
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Preço indisponível';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg ${product.is_hidden ? 'opacity-50' : ''}`}>
      {/* Image */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
        <Image
          src={product.image_url}
          alt={product.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {product.is_featured && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Star size={12} />
            Destaque
          </div>
        )}
        {product.is_hidden && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            Oculto
          </div>
        )}
        {product.discount_percent && product.discount_percent > 0 && (
          <div className="absolute bottom-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold">
            -{product.discount_percent}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category & Marketplace */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
            {product.category || 'Sem categoria'}
          </span>
          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
            {product.marketplace}
          </span>
          {product.source === 'BOT' && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
              Bot
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {product.title}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price */}
        <div className="mb-3">
          {product.original_price && product.original_price > (product.price || 0) && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-through">
              {formatPrice(product.original_price)}
            </p>
          )}
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatPrice(product.price)}
          </p>
        </div>

        {/* Coupon Code */}
        {product.coupon_code && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Cupom: <span className="font-mono font-semibold">{product.coupon_code}</span>
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Eye size={14} />
            {product.view_count}
          </div>
          <div className="flex items-center gap-1">
            <MousePointerClick size={14} />
            {product.click_count}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href={product.affiliate_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            <ExternalLink size={14} />
            Ver Produto
          </a>
          {onEdit && (
            <button
              onClick={() => onEdit(product)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Editar"
            >
              <Edit size={18} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              title="Deletar"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
