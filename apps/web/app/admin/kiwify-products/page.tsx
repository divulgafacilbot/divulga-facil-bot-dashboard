'use client';

import { useEffect, useState } from 'react';
import { getAdminToken } from '@/lib/admin-auth';

type KiwifyProductKind = 'SUBSCRIPTION' | 'ADDON_MARKETPLACE' | 'PROMO_TOKEN_PACK';

type Plan = {
  id: string;
  name: string;
  acesso_bot_geracao?: boolean;
  acesso_bot_download?: boolean;
  acesso_bot_pinterest?: boolean;
  acesso_bot_sugestoes?: boolean;
  included_marketplaces_count?: number;
};

type KiwifyProduct = {
  id: string;
  product_id: string;
  product_name?: string | null;
  kind: KiwifyProductKind;
  plan_id?: string | null;
  bot_type?: string | null;
  quantity: number;
  plan?: Plan | null;
  created_at: string;
};

type FormData = {
  product_id: string;
  product_name: string;
  kind: KiwifyProductKind;
  plan_id: string;
  bot_type: string;
  quantity: number;
};

const KIND_LABELS: Record<KiwifyProductKind, string> = {
  SUBSCRIPTION: 'Assinatura',
  ADDON_MARKETPLACE: 'Addon Marketplace',
  PROMO_TOKEN_PACK: 'Pack Tokens Promo',
};

const BOT_TYPES = ['PROMOCOES', 'DOWNLOAD', 'PINTEREST', 'SUGGESTION'];

const initialFormData: FormData = {
  product_id: '',
  product_name: '',
  kind: 'SUBSCRIPTION',
  plan_id: '',
  bot_type: '',
  quantity: 1,
};

export default function AdminKiwifyProductsPage() {
  const [products, setProducts] = useState<KiwifyProduct[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<KiwifyProduct | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const token = getAdminToken();

    try {
      const [productsRes, plansRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/kiwify-products`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/plans`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [productsData, plansData] = await Promise.all([
        productsRes.json(),
        plansRes.json(),
      ]);

      setProducts(productsData.data || []);
      setPlans(plansData.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: KiwifyProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product_id: product.product_id,
        product_name: product.product_name || '',
        kind: product.kind,
        plan_id: product.plan_id || '',
        bot_type: product.bot_type || '',
        quantity: product.quantity,
      });
    } else {
      setEditingProduct(null);
      setFormData(initialFormData);
    }
    setError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData(initialFormData);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const token = getAdminToken();

    try {
      const url = editingProduct
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/kiwify-products/${editingProduct.id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/kiwify-products`;

      const method = editingProduct ? 'PUT' : 'POST';

      const body: Record<string, unknown> = {
        product_id: formData.product_id,
        product_name: formData.product_name || null,
        kind: formData.kind,
        quantity: formData.quantity,
      };

      if (formData.kind === 'SUBSCRIPTION') {
        body.plan_id = formData.plan_id || null;
        body.bot_type = null;
      } else {
        body.plan_id = null;
        body.bot_type = formData.bot_type || null;
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Erro ao salvar');
      }

      handleCloseModal();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const token = getAdminToken();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/kiwify-products/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }

      setDeleteConfirm(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto');
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const getPlanDescription = (plan: Plan | null | undefined) => {
    if (!plan) return '-';
    const bots = [];
    if (plan.acesso_bot_geracao) bots.push('Promoções');
    if (plan.acesso_bot_download) bots.push('Download');
    if (plan.acesso_bot_pinterest) bots.push('Pins');
    if (plan.acesso_bot_sugestoes) bots.push('Sugestões');
    const botsStr = bots.length > 0 ? bots.join(', ') : 'Nenhum bot';
    const mktStr = plan.included_marketplaces_count ? ` + ${plan.included_marketplaces_count} marketplace${plan.included_marketplaces_count > 1 ? 's' : ''}` : '';
    return `${botsStr}${mktStr}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos Kiwify</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure quais produtos do Kiwify liberam acesso a quais planos/bots
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Novo Mapeamento
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Como funciona?</h3>
        <p className="text-sm text-blue-700">
          Quando um cliente compra no Kiwify, o webhook envia o <code className="bg-blue-100 px-1 rounded">product_id</code>.
          O sistema usa esta tabela para saber qual plano/bot liberar para o usuário.
        </p>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Product ID (Kiwify)</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nome</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tipo</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Libera</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Criado</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                      {product.product_id}
                    </code>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {product.product_name || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      product.kind === 'SUBSCRIPTION'
                        ? 'bg-green-100 text-green-800'
                        : product.kind === 'ADDON_MARKETPLACE'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {KIND_LABELS[product.kind]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {product.kind === 'SUBSCRIPTION' ? (
                      getPlanDescription(product.plan)
                    ) : product.kind === 'ADDON_MARKETPLACE' ? (
                      <span>+{product.quantity} marketplace{product.quantity > 1 ? 's' : ''}</span>
                    ) : (
                      <span>+{product.quantity} tokens ({product.bot_type || 'ALL'})</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {formatDate(product.created_at)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Editar
                      </button>
                      {deleteConfirm === product.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(product.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Nenhum produto mapeado. Clique em &quot;Novo Mapeamento&quot; para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingProduct ? 'Editar Mapeamento' : 'Novo Mapeamento'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product ID (Kiwify) *
                </label>
                <input
                  type="text"
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="kiwi_abc123xyz"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Encontre no webhook: order.Product.product_id
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Produto (opcional)
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Bot Gerador Pro Mensal"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usado como fallback se o product_id não for encontrado
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Produto *
                </label>
                <select
                  value={formData.kind}
                  onChange={(e) => setFormData({ ...formData, kind: e.target.value as KiwifyProductKind })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="SUBSCRIPTION">Assinatura (libera plano completo)</option>
                  <option value="ADDON_MARKETPLACE">Addon Marketplace (adiciona slots)</option>
                  <option value="PROMO_TOKEN_PACK">Pack de Tokens Promocionais</option>
                </select>
              </div>

              {formData.kind === 'SUBSCRIPTION' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plano a Liberar *
                  </label>
                  <select
                    value={formData.plan_id}
                    onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecione um plano</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {getPlanDescription(plan)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.kind === 'ADDON_MARKETPLACE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade de Slots *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {formData.kind === 'PROMO_TOKEN_PACK' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade de Tokens *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Bot (opcional)
                    </label>
                    <select
                      value={formData.bot_type}
                      onChange={(e) => setFormData({ ...formData, bot_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todos os bots</option>
                      {BOT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Criar Mapeamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
