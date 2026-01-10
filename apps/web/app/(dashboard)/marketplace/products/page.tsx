'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { marketplaceApi } from '@/lib/api/marketplace';
import { MarketplaceProduct } from '@/lib/api/types/marketplace';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { ProductForm } from '@/components/marketplace/ProductForm';
import { ProductStats } from '@/components/marketplace/ProductStats';
import { PAGINATION } from '@/lib/constants';

export default function MarketplaceProductsPage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadProducts();
  }, [page]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const { products: data, pagination } = await marketplaceApi.listProducts({ page, limit: PAGINATION.DEFAULT_LIMIT });
      setProducts(data);
      setTotalPages(pagination.totalPages);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (product: MarketplaceProduct) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = () => {
    loadProducts();
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(undefined);
    loadProducts();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produtos do Marketplace</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie seus produtos de afiliados
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      {/* Stats */}
      <ProductStats />

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <ProductForm
              product={editingProduct}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow h-96" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Nenhum produto encontrado</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus size={20} />
            Criar Primeiro Produto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpdate={loadProducts}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
