'use client';
import { useEffect, useState } from 'react';
import { BOT_TYPE_LABELS, BotType } from '@/lib/admin-enums';
import { getAdminToken } from '@/lib/admin-auth';
import { UserRole } from '@/lib/common-enums';

export default function AdminUsersPage() {
  type UserFilters = {
    isActive: '' | 'true' | 'false';
    role: '' | UserRole;
    hasSubscription: '' | 'true' | 'false';
    hasBotLinked: '' | 'true' | 'false';
    emailSearch: string;
  };
  type UserListItem = {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: string;
  };
  type UserDetail = {
    id: string;
    email: string;
    subscriptions?: { plans?: { name?: string | null } | null } | null;
    telegram_bot_links?: Array<{ id: string }>;
    usage_counters?: Array<{ id: string }>;
  };
  type UserAction = 'activate' | 'deactivate' | 'reset-usage' | 'reset-password' | 'unlink-bot';
  type UserActionPayload = { botType?: BotType };

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filters, setFilters] = useState<UserFilters>({
    isActive: '',
    role: '',
    hasSubscription: '',
    hasBotLinked: '',
    emailSearch: '',
  });
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);
  const botTypeOptions: BotType[] = ['ARTS', 'DOWNLOAD'];

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = () => {
    const token = getAdminToken();
    const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
    fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const nextUsers = Array.isArray(data?.data?.users) ? (data.data.users as UserListItem[]) : [];
        setUsers(nextUsers);
      });
  };

  const fetchUserDetail = async (userId: string) => {
    setLoadingDetail(true);
    setResetPasswordValue(null);
    try {
      const token = getAdminToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedUser(data.data);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAction = async (action: UserAction, userId: string, payload?: UserActionPayload) => {
    const token = getAdminToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${userId}/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = await res.json();
    if (data?.data?.temporaryPassword) {
      setResetPasswordValue(data.data.temporaryPassword);
    }
    fetchUsers();
    if (selectedUser?.id === userId) {
      fetchUserDetail(userId);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Usuários</h1>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <input
          placeholder="Buscar por e-mail"
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          value={filters.emailSearch}
          onChange={(e) => setFilters((prev) => ({ ...prev, emailSearch: e.target.value }))}
        />
        <select
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          value={filters.isActive}
          onChange={(e) => setFilters((prev) => ({ ...prev, isActive: e.target.value }))}
        >
          <option value="">Status</option>
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
        <select
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          value={filters.role}
          onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value as UserRole | '' }))}
        >
          <option value="">Plano/Função</option>
          <option value="USER">Usuário</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          value={filters.hasSubscription}
          onChange={(e) => setFilters((prev) => ({ ...prev, hasSubscription: e.target.value }))}
        >
          <option value="">Assinatura</option>
          <option value="true">Com assinatura</option>
          <option value="false">Sem assinatura</option>
        </select>
        <select
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          value={filters.hasBotLinked}
          onChange={(e) => setFilters((prev) => ({ ...prev, hasBotLinked: e.target.value }))}
        >
          <option value="">Bot vinculado</option>
          <option value="true">Com bot</option>
          <option value="false">Sem bot</option>
        </select>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criado em</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.isActive ? 'Ativo' : 'Inativo'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    className="mr-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                    onClick={() => fetchUserDetail(user.id)}
                  >
                    Detalhes
                  </button>
                  <button
                    className="mr-3 rounded-lg border border-gray-200 bg-white px-3 py-1 text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                    onClick={() =>
                      handleAction(user.isActive ? 'deactivate' : 'activate', user.id)
                    }
                  >
                    {user.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    className="mr-3 rounded-lg border border-gray-200 bg-white px-3 py-1 text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                    onClick={() => handleAction('reset-usage', user.id)}
                  >
                    Redefinir uso
                  </button>
                  <button
                    className="mr-3 rounded-lg border border-gray-200 bg-white px-3 py-1 text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                    onClick={() => handleAction('reset-password', user.id)}
                  >
                    Redefinir senha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Detalhes do usuário</h2>
        {loadingDetail && <p>Carregando detalhes...</p>}
        {!loadingDetail && !selectedUser && <p>Selecione um usuário para ver detalhes.</p>}
        {!loadingDetail && selectedUser && (
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>E-mail:</strong> {selectedUser.email}</p>
            <p><strong>Plano:</strong> {selectedUser.subscriptions?.plans?.name || 'FREE'}</p>
            <p><strong>Bots vinculados:</strong> {selectedUser.telegram_bot_links?.length || 0}</p>
            <p><strong>Uso (30d):</strong> {selectedUser.usage_counters?.length || 0} dias</p>
            <div className="flex gap-3 pt-2">
              {botTypeOptions.map((botType) => (
                <button
                  key={botType}
                  className="rounded border border-[var(--color-border)] px-3 py-1"
                  onClick={() =>
                    handleAction('unlink-bot', selectedUser.id, { botType })
                  }
                >
                  Revogar bot {BOT_TYPE_LABELS[botType]}
                </button>
              ))}
            </div>
          </div>
        )}
        {resetPasswordValue && (
          <p className="mt-4 text-sm text-[var(--color-primary)]">
            Senha temporária: <strong>{resetPasswordValue}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
