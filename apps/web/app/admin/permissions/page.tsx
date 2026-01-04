'use client';
import { getAdminToken } from '@/lib/admin-auth';
import { ADMIN_PERMISSIONS, AdminPermission } from '@/lib/admin-enums';
import { useEffect, useState } from 'react';

type AdminRole = 'ADMIN' | 'ADMIN_MASTER';

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions?: AdminPermission[];
};

export default function AdminPermissionsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN' as AdminRole,
    permissions: [] as AdminPermission[],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const permissionLabels: Record<AdminPermission, string> = {
    [AdminPermission.OVERVIEW]: 'Visão geral',
    [AdminPermission.USERS]: 'Usuários',
    [AdminPermission.BOTS]: 'Bots',
    [AdminPermission.USAGE]: 'Uso',
    [AdminPermission.TEMPLATES]: 'Templates',
    [AdminPermission.CAMPAIGNS]: 'Campanhas',
    [AdminPermission.SUPPORT]: 'Suporte',
    [AdminPermission.FINANCE]: 'Financeiro',
    [AdminPermission.PERMISSIONS]: 'Permissões',
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = () => {
    const token = getAdminToken();
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/staff`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setStaff(data.data || []));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', email: '', password: '', role: 'ADMIN', permissions: [] });
    setIsModalOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      password: '',
      role: member.role,
      permissions: member.permissions || [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const token = getAdminToken();
    if (editingId) {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/staff/${editingId}/permissions`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: form.permissions }),
      });
    } else {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/staff`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
    }
    setIsModalOpen(false);
    fetchStaff();
  };

  const handleDeactivate = async (memberId: string) => {
    const token = getAdminToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/staff/${memberId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchStaff();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gerenciamento de Colaboradores</h1>
      <button
        className="mb-4 rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
        onClick={openCreate}
      >
        Adicionar colaborador
      </button>
      <div className="grid gap-4">
        {staff.map((member) => (
          <div key={member.id} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">{member.name}</h3>
            <p className="text-sm text-gray-600">{member.email}</p>
            <p className="text-sm text-gray-600">Função: {member.role}</p>
            <p className="text-sm text-gray-600">Permissões: {member.permissions?.length || 0}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <button className="text-blue-600 hover:text-blue-800" onClick={() => openEdit(member)}>
                Editar
              </button>
              <button className="text-red-600 hover:text-red-800" onClick={() => handleDeactivate(member.id)}>
                Desativar
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            id='modal-de-add-colaborador'
            className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Editar permissões' : 'Criar colaborador com permissões'}
            </h2>
            {!editingId && (
              <div className="space-y-3">
                <input
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
                  placeholder="Nome"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  type="password"
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
                  placeholder="Senha"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <select
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, role: e.target.value as AdminRole }))
                  }
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="ADMIN_MASTER">ADMIN_MASTER</option>
                </select>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {ADMIN_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        permissions: e.target.checked
                          ? [...prev.permissions, perm]
                          : prev.permissions.filter((p) => p !== perm),
                      }));
                    }}
                  />
                  {permissionLabels[perm]}
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded border border-[var(--color-border)] px-4 py-2 text-sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                onClick={handleSubmit}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
