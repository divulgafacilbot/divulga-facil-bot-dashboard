'use client';

import { getFullImageUrl } from '@/lib/image-url';
import { showToast } from '@/lib/toast';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface PublicPageSettings {
  displayName?: string;
  display_name?: string;
  bio?: string;
  headerColor?: string;
  header_color?: string;
  titleColor?: string;
  title_color?: string;
  headerImageUrl?: string;
  header_image_url?: string;
  public_slug?: string;
}

interface PublicCard {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  original_price?: string;
  description?: string;
  imageUrl?: string;
  image_url?: string;
  affiliateUrl?: string;
  affiliate_url?: string;
  marketplace: string;
  coupon?: string;
  category: string;
  source?: string;
  status?: string;
}

// Helper para identificar marketplace pelo link
function identifyMarketplace(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('shopee')) return 'SHOPEE';
  if (lowerUrl.includes('amazon') || lowerUrl.includes('amzn')) return 'AMAZON';
  if (lowerUrl.includes('mercadolivre') || lowerUrl.includes('mercadolibre') || lowerUrl.includes('meli')) return 'MERCADO_LIVRE';
  if (lowerUrl.includes('magazineluiza') || lowerUrl.includes('magalu')) return 'MAGALU';
  return 'OUTROS';
}

// Helper para obter miniatura do marketplace
function getMarketplaceThumbnail(marketplace: string): string | null {
  const thumbnails: Record<string, string> = {
    'SHOPEE': '/miniaturas/miniatura-shopee.png',
    'AMAZON': '/miniaturas/miniatura-amazon.png',
    'MERCADO_LIVRE': '/miniaturas/miniatura-meli.png',
    'MAGALU': '/miniaturas/miniatura-magalu.png',
  };
  return thumbnails[marketplace] || null;
}

export default function PaginaPublicaPage() {
  const [settings, setSettings] = useState<PublicPageSettings | null>(null);
  const [cards, setCards] = useState<PublicCard[]>([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', price: '', originalPrice: '', description: '', affiliateUrl: '',
    marketplace: 'MERCADO_LIVRE', coupon: '', category: 'Outros'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingCard, setEditingCard] = useState<PublicCard | null>(null);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [cardFilter, setCardFilter] = useState<'ACTIVE' | 'HIDDEN'>('ACTIVE');

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    // Parallel fetch to eliminate waterfall
    Promise.all([fetchSettings(), fetchCards()]);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pinterest/settings`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchCards = async () => {
    try {
      // Fetch both ACTIVE and HIDDEN cards for proper stats
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pinterest/cards?status=ACTIVE&status=HIDDEN`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      setCards(data.cards || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const updateSettings = async (updates: Record<string, unknown>) => {
    try {
      // Filter out undefined/null values and validate colors
      const cleanedUpdates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null && value !== '') {
          // Validate color format for color fields
          if ((key === 'headerColor' || key === 'titleColor') && typeof value === 'string') {
            if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
              showToast('Formato de cor inválido. Use #RRGGBB', 'warning');
              return;
            }
          }
          cleanedUpdates[key] = value;
        }
      }

      // Don't make request if no valid updates
      if (Object.keys(cleanedUpdates).length === 0) {
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pinterest/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify(cleanedUpdates)
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('API Error:', data);
        showToast(data.error || 'Erro ao atualizar configurações', 'error');
        return;
      }

      setSettings(data.settings);
      showToast('Configurações atualizadas!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Erro ao atualizar configurações', 'error');
    }
  };

  const handleHeaderImageUpload = async () => {
    if (!headerImageFile) return;

    const formData = new FormData();
    formData.append('image', headerImageFile);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pinterest/settings/header-image`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const result = await res.json();
      setSettings(prev => prev ? { ...prev, header_image_url: result.data?.headerImageUrl || result.headerImageUrl } : null);
      setHeaderImageFile(null);
      showToast('Imagem atualizada!', 'success');
    } catch (error) {
      console.error('Error uploading header image:', error);
      showToast('Erro ao fazer upload da imagem', 'error');
    }
  };

  const openCreateModal = () => {
    setFormData({
      title: '', price: '', originalPrice: '', description: '', affiliateUrl: '',
      marketplace: 'MERCADO_LIVRE', coupon: '', category: 'Outros'
    });
    setSelectedFile(null);
    setEditingCard(null);
    setShowCardModal(true);
  };

  const openEditModal = (card: PublicCard) => {
    setFormData({
      title: card.title,
      price: card.price,
      originalPrice: card.original_price || card.originalPrice || '',
      description: card.description || '',
      affiliateUrl: card.affiliate_url || card.affiliateUrl || '',
      marketplace: card.marketplace,
      coupon: card.coupon || '',
      category: card.category
    });
    setEditingCard(card);
    setSelectedFile(null);
    setShowCardModal(true);
  };

  const handleAffiliateUrlChange = (url: string) => {
    const detectedMarketplace = identifyMarketplace(url);
    setFormData(prev => ({
      ...prev,
      affiliateUrl: url,
      marketplace: detectedMarketplace // Always use detected marketplace
    }));
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCard && !selectedFile) {
      showToast('Selecione uma imagem', 'warning');
      return;
    }

    const data = new FormData();
    if (selectedFile) {
      data.append('image', selectedFile);
    }
    data.append('data', JSON.stringify({
      ...formData,
      source: 'MANUAL'
    }));

    try {
      const url = editingCard
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pinterest/cards/${editingCard.id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pinterest/cards`;

      const res = await fetch(url, {
        method: editingCard ? 'PATCH' : 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: data
      });

      if (!res.ok) throw new Error('Failed to save card');

      showToast('Card salvo com sucesso!', 'success');
      setShowCardModal(false);
      setEditingCard(null);
      fetchCards();
    } catch (error) {
      console.error('Error saving card:', error);
      showToast('Erro ao salvar card', 'error');
    }
  };

  const toggleCardStatus = async (cardId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pinterest/cards/${cardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      fetchCards();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!confirm('Deseja realmente remover este card?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pinterest/cards/${cardId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      fetchCards();
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Página Pública
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
          Gerencie sua vitrine de produtos
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Personalize a aparência da sua página e gerencie seus anúncios.
        </p>
        {settings?.public_slug && (
          <a
            href={`/${settings.public_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white"
          >
            Visualizar Página Pública
          </a>
        )}
      </div>

      {/* Main Row: Appearance + Anúncios/Estatísticas side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Section */}
        <div id="editar-aparencia-da-pagina-publica" className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Aparência da Página
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Personalize como sua página será exibida para os visitantes.
          </p>

          <div className="mt-6 flex flex-col gap-6">
            {/* Header Image */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                Logo / Foto do Header
              </label>
              <div className="mt-2 flex items-center gap-4">
                <div className="relative group">
                  <img
                    src={getFullImageUrl(settings?.header_image_url || settings?.headerImageUrl)}
                    alt="Header"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-border)]"
                  />
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-[var(--color-primary)] rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-[var(--color-primary-hover)] transition-colors">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setHeaderImageFile(e.target.files?.[0] || null);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {headerImageFile && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--color-text-secondary)]">{headerImageFile.name}</span>
                    <button
                      onClick={handleHeaderImageUpload}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setHeaderImageFile(null)}
                      className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Display Name */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                Nome de sua loja
              </label>
              <input
                type="text"
                value={settings?.display_name || settings?.displayName || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, display_name: e.target.value } : null)}
                onBlur={(e) => updateSettings({ displayName: e.target.value })}
                className="mt-2 w-full max-w-[415px] rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
                placeholder="Digite aqui o nome que irá aparecer no header"
              />
            </div>

            {/* Header Color */}
            <div className='flex flex-col min-[1570px]:flex-row max-w-[1000px] w-full justify-between gap-3'>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Cor do Header
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative w-14 h-12 rounded-xl border-2 border-[var(--color-border)] overflow-hidden cursor-pointer">
                    <input
                      type="color"
                      value={settings?.header_color || settings?.headerColor || '#FF006B'}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, header_color: e.target.value } : null)}
                      onBlur={(e) => updateSettings({ headerColor: e.target.value })}
                      className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer border-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={settings?.header_color || settings?.headerColor || '#FF006B'}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, header_color: e.target.value } : null)}
                    onBlur={(e) => updateSettings({ headerColor: e.target.value })}
                    className="max-w-[200px] rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
                    placeholder="#FF006B"
                  />
                </div>
              </div>

              {/* Title Color */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Cor do título
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative w-14 h-12 rounded-xl border-2 border-[var(--color-border)] overflow-hidden cursor-pointer">
                    <input
                      type="color"
                      value={settings?.title_color || settings?.titleColor || '#FFFFFF'}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, title_color: e.target.value } : null)}
                      onBlur={(e) => updateSettings({ titleColor: e.target.value })}
                      className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer border-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={settings?.title_color || settings?.titleColor || '#FFFFFF'}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, title_color: e.target.value } : null)}
                    onBlur={(e) => updateSettings({ titleColor: e.target.value })}
                    className="max-w-[200px] rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>

            {/* Subtítulo */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                Subtítulo da página (máx. 70 caracteres)
              </label>
              <input
                type="text"
                value={settings?.bio || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, bio: e.target.value } : null)}
                onBlur={(e) => updateSettings({ bio: e.target.value })}
                maxLength={70}
                className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
                placeholder="Ex: As melhores ofertas para você!"
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{settings?.bio?.length || 0}/70</p>
            </div>
          </div>
        </div>

        {/* Add Cards + Stats Column */}
        <div className="flex flex-col gap-6">
          <div id="adicionar-anuncios-manualmente" className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
              Adicionar Anúncios
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Crie cards manualmente ou deixe o Bot de Pins criar automaticamente via Telegram.
            </p>
            <button
              id="adicionar-itens-manualmente-btn"
              onClick={openCreateModal}
              className="mt-6 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white"
            >
              + Adicionar Card Manualmente
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
              Estatísticas
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Resumo dos seus anúncios cadastrados.
            </p>
            <div className="mt-6 flex gap-6">
              <div>
                <p className="text-3xl font-bold text-[var(--color-primary)]">{cards.length}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Total de cards</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{cards.filter(c => c.status === 'ACTIVE').length}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Ativos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-600">{cards.filter(c => c.status !== 'ACTIVE').length}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Ocultos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div id="meus-anuncios-adicionados" className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
              Meus Anúncios ({cards.filter(c => c.status === cardFilter).length})
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Gerencie todos os seus cards de produtos.
            </p>
          </div>

          {/* Filter Dropdown */}
          <select
            value={cardFilter}
            onChange={(e) => setCardFilter(e.target.value as 'ACTIVE' | 'HIDDEN')}
            className="px-4 py-2 text-sm font-medium rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="ACTIVE">Ativos ({cards.filter(c => c.status === 'ACTIVE').length})</option>
            <option value="HIDDEN">Ocultos ({cards.filter(c => c.status === 'HIDDEN').length})</option>
          </select>
        </div>

        <div className="mt-6 max-h-[500px] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.filter(c => c.status === cardFilter).map((card) => {
              const thumbnailSrc = getMarketplaceThumbnail(card.marketplace);
              const cardClass = card.source === 'MANUAL' ? 'pinterest-manual-card' : 'pinterest-bot-card';

              return (
                <div
                  key={card.id}
                  className={`${cardClass} rounded-2xl border border-[var(--color-border)] overflow-hidden relative`}
                >
                  {/* Marketplace Thumbnail */}
                  {thumbnailSrc && (
                    <div className="absolute top-2 left-2 z-10">
                      <Image
                        src={thumbnailSrc}
                        alt={card.marketplace}
                        width={32}
                        height={32}
                        className="rounded shadow-md"
                      />
                    </div>
                  )}

                  <img
                    src={getFullImageUrl(card.image_url || card.imageUrl)}
                    alt={card.title}
                    className="w-full h-48 object-cover"
                  />

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${card.source === 'MANUAL'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                        }`}>
                        {card.source === 'MANUAL' ? 'Manual' : 'Bot'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${card.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {card.status === 'ACTIVE' ? 'Ativo' : 'Oculto'}
                      </span>
                    </div>

                    <h3 className="font-semibold text-[var(--color-text-main)] mb-1 truncate" title={card.title}>
                      {card.title}
                    </h3>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-green-600">{card.price}</span>
                      {(card.original_price || card.originalPrice) && (
                        <span className="text-sm text-[var(--color-text-secondary)] line-through">
                          {card.original_price || card.originalPrice}
                        </span>
                      )}
                    </div>

                    {card.coupon && (
                      <div className="mb-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full inline-block font-semibold">
                        {card.coupon}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openEditModal(card)}
                        className="flex-1 text-xs px-2 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleCardStatus(card.id, card.status || 'INACTIVE')}
                        className={`flex-1 text-xs px-2 py-2 rounded-xl border transition-colors ${card.status === 'ACTIVE'
                            ? 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                          }`}
                      >
                        {card.status === 'ACTIVE' ? 'Ocultar' : 'Exibir novamente'}
                      </button>
                      <button
                        onClick={() => deleteCard(card.id)}
                        className="flex-1 text-xs px-2 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {cards.filter(c => c.status === cardFilter).length === 0 && (
            <p className="text-center text-[var(--color-text-secondary)] py-8">
              {cardFilter === 'ACTIVE'
                ? 'Nenhum card ativo. Adicione seu primeiro card manualmente ou use o Bot de Pins no Telegram!'
                : 'Nenhum card oculto.'}
            </p>
          )}
        </div>
      </div>

      {/* Modal for Create/Edit Card */}
      {showCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowCardModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-[var(--color-text-main)]">
              {editingCard ? 'Editar Card' : 'Adicionar Card Manualmente'}
            </h2>

            <form onSubmit={handleSaveCard} className="mt-4 space-y-4 text-sm">
              {/* Image Upload */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Foto do Produto {!editingCard && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required={!editingCard}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                />
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Upload obrigatório (não aceita URL)</p>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Nome do Produto {!editingCard && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  required={!editingCard}
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                  placeholder="Ex: Fone Bluetooth XYZ"
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                    Preço {!editingCard && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={!editingCard}
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                    placeholder="R$ 99,90"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                    Preço Original
                  </label>
                  <input
                    type="text"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                    placeholder="R$ 149,90"
                  />
                </div>
              </div>

              {/* Affiliate URL */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Link de Afiliado {!editingCard && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="url"
                  required={!editingCard}
                  value={formData.affiliateUrl}
                  onChange={(e) => handleAffiliateUrlChange(e.target.value)}
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                  placeholder="https://..."
                />
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">O marketplace será identificado automaticamente</p>
              </div>

              {/* Marketplace - Auto-detected (readonly display) */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Marketplace (detectado automaticamente)
                </label>
                <div className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-gray-100 px-4 py-3 text-sm font-medium text-[var(--color-text-main)]">
                  {formData.marketplace === 'MERCADO_LIVRE' && 'Mercado Livre'}
                  {formData.marketplace === 'SHOPEE' && 'Shopee'}
                  {formData.marketplace === 'AMAZON' && 'Amazon'}
                  {formData.marketplace === 'MAGALU' && 'Magazine Luiza'}
                  {formData.marketplace === 'OUTROS' && 'Outro'}
                  {!formData.marketplace && 'Aguardando link...'}
                </div>
              </div>

              {/* Category - Editable when editing */}
              {editingCard && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                    placeholder="Ex: Eletrônicos, Casa, Moda..."
                  />
                </div>
              )}

              {/* Coupon */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Cupom de Desconto (opcional)
                </label>
                <input
                  type="text"
                  value={formData.coupon}
                  onChange={(e) => setFormData(prev => ({ ...prev, coupon: e.target.value }))}
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                  placeholder="CUPOM10"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Descrição (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                  placeholder="Detalhes do produto..."
                />
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
