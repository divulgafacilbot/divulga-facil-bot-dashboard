'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getAdminToken } from '@/lib/admin-auth';

interface Template {
  id: string;
  name: string;
  story_image: string;
  feed_image: string;
  category: string;
  owner_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateStats {
  total: number;
  active: number;
  inactive: number;
  byCategory: Array<{ category: string; count: number }>;
}

const resolveTemplateImage = (value: string) => {
  if (value.startsWith('http')) return value;
  if (value.startsWith('/templates')) return value;
  if (value.startsWith('/uploads')) {
    return `${process.env.NEXT_PUBLIC_API_BASE_URL}${value}`;
  }
  return value;
};

const festiveDates = [
  { name: 'Páscoa', month: 3, day: 31 },
  { name: 'Dia das Mães', month: 5, day: 12 },
  { name: 'Dia dos Namorados', month: 6, day: 12 },
  { name: 'Dia dos Pais', month: 8, day: 11 },
  { name: 'Dia das Crianças', month: 10, day: 12 },
  { name: 'Natal', month: 12, day: 25 },
];

const getNextFestiveDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates = festiveDates.map((item) => {
    let date = new Date(today.getFullYear(), item.month - 1, item.day);
    if (date < today) {
      date = new Date(today.getFullYear() + 1, item.month - 1, item.day);
    }
    return { ...item, date };
  });

  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  return candidates[0];
};

const formatFestiveDate = (date: Date) =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

export default function AdminTemplatesPage() {
  const categories = [
    'Mercado Livre',
    'Magalu',
    'Shopee',
    'Amazon',
    'Datas especiais',
    'Diversos',
    'Templates Personalizados',
  ] as const;
  type TemplateCategory = typeof categories[number];

  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | ''>('');
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCanvaModalOpen, setIsCanvaModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    category: '' as TemplateCategory | '',
    feed: null as File | null,
    story: null as File | null,
  });

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      const token = getAdminToken();
      const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/templates`);
      if (selectedCategory) url.searchParams.append('category', selectedCategory);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/templates/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const toggleActiveStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      const token = getAdminToken();
      const action = currentStatus ? 'deactivate' : 'activate';
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/templates/${templateId}/${action}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (data.success) {
        fetchTemplates();
        fetchStats();
      }
    } catch (error) {
      console.error('Error toggling template status:', error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const token = getAdminToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        fetchTemplates();
        fetchStats();
      } else {
        alert(data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setFormState({ name: '', category: '', feed: null, story: null });
    setIsCreateOpen(true);
  };

  const openEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormState({
      name: template.name,
      category: template.category as TemplateCategory,
      feed: null,
      story: null,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async () => {
    const token = getAdminToken();
    const formData = new FormData();
    formData.append('name', formState.name);
    formData.append('category', formState.category);
    if (formState.feed) formData.append('feed_image', formState.feed);
    if (formState.story) formData.append('story_image', formState.story);

    const url = editingTemplate
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/templates/${editingTemplate.id}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/templates`;
    const method = editingTemplate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || 'Falha ao salvar template');
      return;
    }
    setIsCreateOpen(false);
    fetchTemplates();
    fetchStats();
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  const nextFestive = getNextFestiveDate();

  return (
    <div className="p-8">
        <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestão de Templates</h1>
        <p className="text-gray-600">Gerencie templates base e personalizados</p>
        </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
          onClick={openCreate}
        >
          Criar template base
        </button>
        <button
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
          onClick={() => setIsCanvaModalOpen(true)}
        >
          Editar no Canva
        </button>
        {nextFestive && (
          <div className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
              Próxima data festiva
            </p>
            <p className="font-semibold text-gray-900">
              {nextFestive.name} • {formatFestiveDate(nextFestive.date)}
            </p>
          </div>
        )}
      </div>

      {stats && (
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600">Total de templates</h3>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600">Ativos</h3>
              <p className="text-3xl font-bold mt-2 text-green-600">{stats.active}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600">Inativos</h3>
              <p className="text-3xl font-bold mt-2 text-gray-600">{stats.inactive}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600">Categorias</h3>
              <p className="text-3xl font-bold mt-2">{stats.byCategory.length}</p>
            </div>
          </div>
        )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Templates</h2>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | '')}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Prévia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Image
                        src={resolveTemplateImage(template.feed_image)}
                        alt="Feed"
                        width={40}
                        height={50}
                        className="h-[50px] w-[40px] rounded border border-[var(--color-border)] object-contain bg-white"
                        unoptimized
                      />
                      <Image
                        src={resolveTemplateImage(template.story_image)}
                        alt="Story"
                        width={28}
                        height={50}
                        className="h-[50px] w-[28px] rounded border border-[var(--color-border)] object-contain bg-white"
                        unoptimized
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{template.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                      {template.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActiveStatus(template.id, template.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        template.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      type="button"
                      aria-label="Alternar status"
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          template.is_active ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openEdit(template)}
                      className="text-gray-700 hover:text-gray-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {templates.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhum template encontrado. {selectedCategory && 'Tente alterar o filtro de categoria.'}
          </div>
        )}
      </div>

      {stats && stats.byCategory.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Templates por categoria</h2>
          <div className="grid grid-cols-3 gap-4">
            {stats.byCategory.map((cat) => (
              <div key={cat.category} className="flex justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{cat.category}</span>
                <span className="text-gray-600">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-4 top-4 text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              type="button"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold text-[var(--color-text-main)]">
              {editingTemplate ? 'Editar template base' : 'Upload de template base'}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Envie as artes base seguindo os requisitos abaixo.
            </p>

            <div className="mt-6 space-y-6">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                <h3 className="font-semibold text-[var(--color-text-main)]">
                  Requisitos das Artes
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)]">•</span>
                    <span>São necessárias as duas artes para o template base</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)]">•</span>
                    <span>
                      <strong>Template Feed:</strong> Formato vertical (1080x1350px - proporção 4:5)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)]">•</span>
                    <span>
                      <strong>Template Story:</strong> Formato vertical (1080x1920px - proporção 9:16)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)]">•</span>
                    <span>Formatos aceitos: JPG, PNG</span>
                  </li>
                </ul>
              </div>

              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Nome do template
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: Promoção Primavera"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Categoria
                  </span>
                  <select
                    className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
                    value={formState.category}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        category: event.target.value as TemplateCategory | '',
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Anexar template feed
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, feed: event.target.files?.[0] || null }))
                    }
                    className="w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-primary)] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Anexar template story
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, story: event.target.files?.[0] || null }))
                    }
                    className="w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-primary)] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border-2 border-[var(--color-border)] bg-white px-6 py-2 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:bg-[var(--color-background)]"
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90"
                  type="button"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCanvaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsCanvaModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setIsCanvaModalOpen(false)}
              className="absolute right-4 top-4 text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              type="button"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold text-[var(--color-text-main)]">
              Editar no Canva
            </h2>
            <h5 className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <strong>1) </strong>Seu layout novo necessita obrigatoriamente de 2 formatos, ambos padronizados no Canva: formato feed e formato story.
            </h5>
            <h5 className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <strong>2) </strong>Após clicar no botão e o template padrão se abrir, clique em <strong>Arquivo</strong> &gt; <strong>Fazer uma cópia</strong>, conforme o vídeo abaixo.
            </h5>
            <h5 className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <strong>3) </strong>Depois de prontas as duas artes, anexe pelo botão <strong>Criar template base</strong>.
            </h5>

            <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
              <video src="/Canva.mp4" controls className="h-auto w-full" />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <a
                className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-5 py-2 text-center text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90"
                href="https://www.canva.com/design/DAG88NhTX6o/YeHyZO5pxBvB79VzA86L8Q/edit?utm_content=DAG88NhTX6o&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton"
                target="_blank"
                rel="noreferrer"
              >
                Editar template de feed
              </a>
              <a
                className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-5 py-2 text-center text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90"
                href="https://www.canva.com/design/DAG88Nru2NU/9YuU22yvNeP9frr06sUgtw/edit?utm_content=DAG88Nru2NU&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton"
                target="_blank"
                rel="noreferrer"
              >
                Editar template de story
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
