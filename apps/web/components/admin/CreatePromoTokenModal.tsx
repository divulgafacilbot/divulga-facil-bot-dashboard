'use client';

import { useState, useEffect, useRef } from 'react';
import type { CreatePromoTokenInput } from '../../types/promo-token.types';
import { BOT_TYPE_LABELS, type BotType } from '../../lib/admin-enums';
import { getAdminToken } from '../../lib/admin-auth';

interface CreatePromoTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (input: CreatePromoTokenInput) => Promise<void>;
}

interface UserSearchResult {
  id: string;
  email: string;
}

// Helper functions for Brazilian date format (dd/mm/aaaa)
function parseBrazilianDateToISO(brazilianDate: string): string {
  if (!brazilianDate) return '';
  // Expected format: dd/mm/yyyy
  const match = brazilianDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  // Set expiration to last minute of the day (23:59:59)
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    23,
    59,
    59
  );
  if (isNaN(date.getTime())) return '';
  return date.toISOString();
}

function isValidBrazilianDate(value: string): boolean {
  if (!value) return true; // Empty is valid (optional field)
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const [, day, month, year] = match;
  const d = parseInt(day);
  const m = parseInt(month);
  const y = parseInt(year);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 2024 || y > 2100) return false;
  // Check if date is today or in the future
  const date = new Date(y, m - 1, d, 23, 59, 59);
  return date > new Date();
}

export default function CreatePromoTokenModal({ isOpen, onClose, onSuccess }: CreatePromoTokenModalProps) {
  const [formData, setFormData] = useState<CreatePromoTokenInput>({
    botType: 'PROMOCOES' as BotType,
    userId: '',
    name: '',
    description: '',
    expiresAt: '',
  });
  const [displayDate, setDisplayDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Email search state
  const [emailSearch, setEmailSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus the modal when it opens
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  // Search users by email - triggered on blur
  const searchUserByEmail = async () => {
    if (emailSearch.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      setSearchStatus('idle');
      return;
    }

    setSearchStatus('loading');

    try {
      const token = getAdminToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/search-email?email=${encodeURIComponent(emailSearch)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        setSearchStatus('error');
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        setSearchResults(data.data);
        setShowDropdown(true);
        setSearchStatus('success');
      } else {
        setSearchResults([]);
        setShowDropdown(false);
        setSearchStatus('error');
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchStatus('error');
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleEmailBlur = () => {
    // Small delay to allow click on dropdown items
    setTimeout(() => {
      if (!selectedUser && emailSearch.length >= 3) {
        searchUserByEmail();
      }
    }, 150);
  };

  const handleEmailFocus = () => {
    if (searchResults.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmailSearch(value);
    // Reset status to idle when user starts typing
    setSearchStatus('idle');
    setSearchResults([]);
    setShowDropdown(false);
  };

  if (!isOpen) return null;

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setFormData({ ...formData, userId: user.id });
    setEmailSearch(user.email);
    setShowDropdown(false);
    setSearchStatus('success');
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setFormData({ ...formData, userId: '' });
    setEmailSearch('');
    setSearchResults([]);
    setSearchStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate user selection
    if (!formData.userId) {
      setError('Selecione um usuário antes de criar o token.');
      return;
    }

    // Validate date if provided
    if (displayDate && !isValidBrazilianDate(displayDate)) {
      setDateError('Data inválida. Use o formato dd/mm/aaaa e uma data futura.');
      return;
    }

    setIsSubmitting(true);

    try {
      const isoDate = parseBrazilianDateToISO(displayDate);
      await onSuccess({
        ...formData,
        description: formData.description || undefined,
        expiresAt: isoDate || undefined,
      });
      // Reset form
      setFormData({
        botType: 'PROMOCOES' as BotType,
        userId: '',
        name: '',
        description: '',
        expiresAt: '',
      });
      setDisplayDate('');
      setDateError(null);
      setSelectedUser(null);
      setEmailSearch('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar token');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        botType: 'PROMOCOES' as BotType,
        userId: '',
        name: '',
        description: '',
        expiresAt: '',
      });
      setDisplayDate('');
      setDateError(null);
      setError(null);
      setSelectedUser(null);
      setEmailSearch('');
      setSearchResults([]);
      setSearchStatus('idle');
      onClose();
    }
  };

  const handleDateChange = (value: string) => {
    setDateError(null);
    // Only allow digits and slashes
    let formatted = value.replace(/[^\d\/]/g, '');
    // Auto-add slashes as user types
    if (formatted.length === 2 && !formatted.includes('/')) {
      formatted += '/';
    } else if (formatted.length === 5 && formatted.charAt(2) === '/' && formatted.charAt(4) !== '/') {
      formatted = formatted.slice(0, 5) + '/' + formatted.slice(5);
    }
    // Limit to 10 characters (dd/mm/aaaa)
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }
    setDisplayDate(formatted);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose} aria-hidden="true">
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        <h2 id="modal-title" className="text-2xl font-bold text-[var(--color-text-main)] mb-6">
          Criar Token Promocional
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Search - First field */}
          <div className="relative">
            <label htmlFor="userSearch" className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">
              Usuário Destinatário *
            </label>
            {selectedUser ? (
              <div className="flex items-center justify-between px-4 py-3 border border-green-300 bg-green-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-green-800">{selectedUser.email}</span>
                  <span className="text-xs text-green-600 ml-2">(Selecionado)</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearUser}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Alterar
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2">
                  <input
                    id="userSearch"
                    type="text"
                    value={emailSearch}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onFocus={handleEmailFocus}
                    onBlur={handleEmailBlur}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
                    placeholder="Digite o email do usuário..."
                    autoComplete="off"
                  />
                  {/* Status indicator dot */}
                  <div
                    className={`w-4 h-4 rounded-full flex-shrink-0 transition-colors duration-200 ${
                      searchStatus === 'loading'
                        ? 'bg-yellow-400'
                        : searchStatus === 'success'
                        ? 'bg-green-500'
                        : searchStatus === 'error'
                        ? 'bg-red-500'
                        : 'bg-gray-300'
                    }`}
                    title={
                      searchStatus === 'loading'
                        ? 'Buscando...'
                        : searchStatus === 'success'
                        ? 'Usuário encontrado'
                        : searchStatus === 'error'
                        ? 'Usuário não encontrado'
                        : 'Aguardando busca'
                    }
                    aria-label={
                      searchStatus === 'loading'
                        ? 'Buscando usuário'
                        : searchStatus === 'success'
                        ? 'Usuário encontrado'
                        : searchStatus === 'error'
                        ? 'Usuário não encontrado'
                        : 'Aguardando busca'
                    }
                  />
                </div>
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-sm font-medium text-gray-900">{user.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              O usuário deve já ter uma conta cadastrada no sistema.
            </p>
          </div>

          {/* Bot Type */}
          <div>
            <label htmlFor="botType" className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">
              Tipo de Bot *
            </label>
            <select
              id="botType"
              value={formData.botType}
              onChange={(e) => setFormData({ ...formData, botType: e.target.value as BotType })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
              required
            >
              <option value="PROMOCOES">{BOT_TYPE_LABELS.PROMOCOES}</option>
              <option value="DOWNLOAD">{BOT_TYPE_LABELS.DOWNLOAD}</option>
              <option value="PINTEREST">{BOT_TYPE_LABELS.PINTEREST}</option>
              <option value="SUGGESTION">{BOT_TYPE_LABELS.SUGGESTION}</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">
              Nome *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
              placeholder="Ex: Token Promocional Lançamento"
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500 mt-1">{formData.name.length}/100 caracteres</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">
              Descrição (opcional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] resize-none"
              placeholder="Descreva o propósito deste token..."
              rows={4}
              maxLength={5000}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.description?.length || 0}/5000 caracteres</p>
          </div>

          {/* Expiry Date */}
          <div>
            <label htmlFor="expiresAt" className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">
              Data de Expiração (opcional)
            </label>
            <input
              id="expiresAt"
              type="text"
              value={displayDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] ${
                dateError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="dd/mm/aaaa"
              maxLength={10}
            />
            {dateError ? (
              <p className="text-xs text-red-500 mt-1">{dateError}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para token permanente (sem expiração)
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.userId}
              className="flex-1 px-6 py-3 bg-[var(--color-secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Criando...' : 'Criar Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
