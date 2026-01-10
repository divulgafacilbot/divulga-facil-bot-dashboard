'use client';

import { useState, useEffect } from 'react';
import { MarketplaceProduct, CreateMarketplaceProductInput, UpdateMarketplaceProductInput } from '@/lib/api/types/marketplace';
import { marketplaceApi } from '@/lib/api/marketplace';

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

const MARKETPLACES = [
  'SHOPEE',
  'AMAZON',
  'MERCADO_LIVRE',
  'ALIEXPRESS',
  'MAGALU',
  'AMERICANAS',
  'SHEIN',
];

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Selecione...</option>
            {MARKETPLACES.map((mkt) => (
              <option key={mkt} value={mkt}>
                {mkt}
              </option>
            ))}
          </select>
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
