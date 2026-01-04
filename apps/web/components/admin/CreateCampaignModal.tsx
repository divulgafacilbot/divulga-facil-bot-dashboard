/**
 * Create Campaign Modal Component
 * Modal for creating new promotional campaigns
 */

import { getAdminToken } from '@/lib/admin-auth';
import { useRef, useState } from 'react';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCampaignModal({ isOpen, onClose, onSuccess }: CreateCampaignModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    product_url: '',
  });
  const [mainVideo, setMainVideo] = useState<File | null>(null);
  const [assets, setAssets] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mainVideoInputRef = useRef<HTMLInputElement | null>(null);
  const assetsInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!mainVideo) {
        setError('Selecione o vídeo principal.');
        setLoading(false);
        return;
      }

      const token = getAdminToken();
      const data = new FormData();

      data.append('name', formData.name);
      data.append('price', formData.price);
      data.append('product_url', formData.product_url);
      data.append('main_video', mainVideo);

      assets.forEach((file) => {
        data.append('assets', file);
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/campaigns`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || 'Falha ao criar campanha');
      }

      setFormData({ name: '', price: '', product_url: '' });
      setMainVideo(null);
      setAssets([]);
      if (mainVideoInputRef.current) {
        mainVideoInputRef.current.value = '';
      }
      if (assetsInputRef.current) {
        assetsInputRef.current.value = '';
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar campanha');
      console.error('Error creating campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-lg)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
          type="button"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">
          Nova Campanha
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Crie uma nova campanha com um de seus produtos para afiliados poderem divulgar
        </p>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                Nome do Produto
              </span>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Descaroçador de bananas Polishop"
                className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                Preço do Produto (R$)
              </span>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="99.90"
                className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                URL do Produto
              </span>
              <input
                type="url"
                required
                value={formData.product_url}
                onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
                placeholder="https://exemplo.com/produto"
                className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                Vídeo Principal
              </span>
              <input
                ref={mainVideoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setMainVideo(file);
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => mainVideoInputRef.current?.click()}
                  className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90"
                >
                  Anexar vídeo
                </button>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {mainVideo ? mainVideo.name : 'Nenhum vídeo selecionado'}
                </span>
                {mainVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      setMainVideo(null);
                      if (mainVideoInputRef.current) {
                        mainVideoInputRef.current.value = '';
                      }
                    }}
                    className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
                    aria-label="Remover vídeo principal"
                  >
                    ×
                  </button>
                )}
              </div>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                Anexar Assets (imagens, vídeos, etc.)
              </span>
              <input
                ref={assetsInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  if (selected.length) {
                    setAssets((prev) => [...prev, ...selected]);
                  }
                  if (assetsInputRef.current) {
                    assetsInputRef.current.value = '';
                  }
                }}
                className="w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-primary)] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              {assets.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {assets.map((file, index) => (
                    <li
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-main)]"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setAssets((prev) => prev.filter((_, i) => i !== index))}
                        className="ml-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
                        aria-label={`Remover ${file.name}`}
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                Selecione múltiplos arquivos para incluir na campanha
              </p>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border-2 border-[var(--color-border)] bg-white px-6 py-2 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:bg-[var(--color-background)] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              id='criar-campanha-btn'
              type="submit"
              disabled={loading}
              className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Campanha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
