'use client';

import { useState, useEffect } from 'react';
import { MarketplaceProduct, CreateMarketplaceProductInput, UpdateMarketplaceProductInput } from '@/lib/api/types/marketplace';
import { marketplaceApi } from '@/lib/api/marketplace';
import { api } from '@/lib/api';
import Link from 'next/link';

interface ProductFormProps {
  product?: MarketplaceProduct;
  onSuccess?: () => void;
  onCancel?: () => void;
}

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
  'Outros',
];

interface AvailableMarketplace {
  value: string;
  label: string;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMarketplaces, setAvailableMarketplaces] = useState<AvailableMarketplace[]>([]);
  const [marketplacesLoading, setMarketplacesLoading] = useState(true);
  const [needsConfiguration, setNeedsConfiguration] = useState(false);
  const [configurationMessage, setConfigurationMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    source: 'MANUAL' as 'BOT' | 'MANUAL',
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    discountPercent: '',
    category: '',
    affiliateUrl: '',
    imageUrl: '',
    marketplace: '',
    couponCode: '',
    customNote: '',
    isFeatured: false,
    isHidden: false,
  });

  // Fetch available marketplaces on mount
  useEffect(() => {
    const fetchAvailableMarketplaces = async () => {
      try {
        setMarketplacesLoading(true);
        const response = await api.marketplaces.getAvailable();
        if (response.success) {
          setAvailableMarketplaces(response.data.marketplaces);
          setNeedsConfiguration(response.data.needsConfiguration);
          setConfigurationMessage(response.data.message || null);
        }
      } catch (err) {
        console.error('Failed to fetch available marketplaces:', err);
        setError('Erro ao carregar marketplaces disponiveis');
      } finally {
        setMarketplacesLoading(false);
      }
    };

    fetchAvailableMarketplaces();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        source: product.source,
        title: product.title,
        description: product.description || '',
        price: product.price?.toString() || '',
        originalPrice: product.original_price?.toString() || '',
        discountPercent: product.discount_percent?.toString() || '',
        category: product.category || '',
        affiliateUrl: product.affiliate_url,
        imageUrl: product.image_url,
        marketplace: product.marketplace,
        couponCode: product.coupon_code || '',
        customNote: product.custom_note || '',
        isFeatured: product.is_featured,
        isHidden: product.is_hidden,
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : undefined,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : undefined,
      };

      if (product) {
        // Update
        await marketplaceApi.updateProduct(product.id, data as UpdateMarketplaceProductInput);
      } else {
        // Create
        await marketplaceApi.createProduct(data as CreateMarketplaceProductInput);
      }

      onSuccess?.();
    } catch (err) {
      console.error('Failed to save product:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Show configuration warning if needed
  if (needsConfiguration && !product) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-3 rounded">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold">Configuracao necessaria</p>
              <p className="mt-1 text-sm">{configurationMessage}</p>
              <Link
                href="/dashboard/settings/marketplaces"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              >
                Configurar marketplaces
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Título *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descrição
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          maxLength={5000}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Price & Original Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Preço (R$)
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Preço Original (R$)
          </label>
          <input
            type="number"
            name="originalPrice"
            value={formData.originalPrice}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Category & Marketplace */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Categoria
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Selecione...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Marketplace *
          </label>
          <select
            name="marketplace"
            value={formData.marketplace}
            onChange={handleChange}
            required
            disabled={marketplacesLoading || availableMarketplaces.length === 0}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {marketplacesLoading ? (
              <option value="">Carregando...</option>
            ) : availableMarketplaces.length === 0 ? (
              <option value="">Nenhum marketplace disponivel</option>
            ) : (
              <>
                <option value="">Selecione...</option>
                {availableMarketplaces.map((mkt) => (
                  <option key={mkt.value} value={mkt.value}>
                    {mkt.label}
                  </option>
                ))}
              </>
            )}
          </select>
          {availableMarketplaces.length > 0 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {availableMarketplaces.length} marketplace{availableMarketplaces.length !== 1 ? 's' : ''} disponivel{availableMarketplaces.length !== 1 ? 'is' : ''} no seu plano
            </p>
          )}
        </div>
      </div>

      {/* Affiliate URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          URL de Afiliado *
        </label>
        <input
          type="url"
          name="affiliateUrl"
          value={formData.affiliateUrl}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          URL da Imagem *
        </label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Coupon Code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Código do Cupom
        </label>
        <input
          type="text"
          name="couponCode"
          value={formData.couponCode}
          onChange={handleChange}
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Checkboxes */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isFeatured"
            checked={formData.isFeatured}
            onChange={handleChange}
            className="rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Destaque</span>
        </label>
        {product && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isHidden"
              checked={formData.isHidden}
              onChange={handleChange}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Ocultar</span>
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Salvando...' : product ? 'Atualizar Produto' : 'Criar Produto'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
