'use client';

import { useState } from 'react';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import { getAdminToken } from '@/lib/admin-auth';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formValues, setFormValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const getPasswordRequirements = (password: string) => ({
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  });

  const getPasswordError = (password: string) => {
    if (!password) {
      return '';
    }
    if (password.length < 8) {
      return 'Minimo de 8 caracteres.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Inclua uma letra maiuscula.';
    }
    if (!/[a-z]/.test(password)) {
      return 'Inclua uma letra minuscula.';
    }
    if (!/\d/.test(password)) {
      return 'Inclua um numero.';
    }
    return '';
  };

  const passwordRequirements = getPasswordRequirements(formValues.newPassword);
  const newPasswordError = getPasswordError(formValues.newPassword);
  const confirmPasswordError =
    formValues.confirmPassword && formValues.newPassword !== formValues.confirmPassword
      ? 'As senhas não conferem.'
      : '';

  const handleChange =
    (field: keyof typeof formValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const resetForm = () => {
    setFormValues({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (newPasswordError) {
      setFormError(newPasswordError);
      return;
    }
    if (confirmPasswordError) {
      setFormError(confirmPasswordError);
      return;
    }

    const token = getAdminToken();
    if (!token) {
      setFormError('Sessao expirada. Faca login novamente.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/auth/change-password`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formValues),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nao foi possivel atualizar a senha.');
      }
      setFormSuccess('Senha atualizada com sucesso.');
      resetForm();
    } catch (err) {
      const error = err as Error;
      setFormError(error.message || 'Nao foi possivel atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2D6AEF]">
          Configuracoes
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Seguranca do admin</h1>
        <p className="mt-2 text-sm text-gray-600">
          Atualize a senha do seu usuario administrativo com seguranca.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold text-gray-900">Trocar senha</h2>
        <p className="mt-2 text-sm text-gray-600">
          Use uma senha forte com letra maiuscula, minuscula e numero.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            id="current-password"
            label="Senha atual"
            type="password"
            value={formValues.currentPassword}
            onChange={handleChange('currentPassword')}
          />

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-xs text-gray-600">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Requisitos da senha
            </p>
            <ul className="mt-2 space-y-1">
              <li className={passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}>
                Minimo de 8 caracteres
              </li>
              <li className={passwordRequirements.hasUpper ? 'text-green-600' : 'text-gray-500'}>
                Uma letra maiuscula
              </li>
              <li className={passwordRequirements.hasLower ? 'text-green-600' : 'text-gray-500'}>
                Uma letra minuscula
              </li>
              <li className={passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}>
                Um numero
              </li>
            </ul>
          </div>

          <Input
            id="new-password"
            label="Nova senha"
            type="password"
            value={formValues.newPassword}
            onChange={handleChange('newPassword')}
            error={newPasswordError}
          />
          <Input
            id="confirm-password"
            label="Confirmar nova senha"
            type="password"
            value={formValues.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={confirmPasswordError}
          />

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {formSuccess}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Atualizar senha
          </Button>
        </form>
      </div>
    </div>
  );
}
