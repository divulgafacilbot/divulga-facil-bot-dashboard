'use client';

import { useState, useEffect } from 'react';
import { SUBSCRIPTION_STATUS_LABELS, SubscriptionStatus } from '@/lib/admin-enums';

interface SubscriptionData {
  id?: string;
  status: SubscriptionStatus | 'NO_SUBSCRIPTION';
  expiresAt?: string | null;
  graceUntil?: string | null;
  hasActiveSubscription: boolean;
  plan?: {
    id: string;
    name: string;
    billingCycle: string;
    maxArtesPerDay: number;
    maxDownloadsPerDay: number;
    includedMarketplaces: number;
    hasBotGeracao: boolean;
    hasBotDownload: boolean;
  } | null;
  kiwifyLinked: boolean;
}

type LinkingStep = 'email' | 'code' | 'success';

const statusClasses: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  GRACE: 'bg-yellow-100 text-yellow-800',
  PENDING_CONFIRMATION: 'bg-blue-100 text-blue-800',
  PAST_DUE: 'bg-orange-100 text-orange-800',
  CANCELED: 'bg-gray-100 text-gray-800',
  EXPIRED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  CHARGEBACK: 'bg-red-100 text-red-800',
  NO_SUBSCRIPTION: 'bg-gray-100 text-gray-600',
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkingStep, setLinkingStep] = useState<LinkingStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [linkingError, setLinkingError] = useState<string | null>(null);
  const [linkingLoading, setLinkingLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/finance/subscription`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubscription(data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkingError(null);
    setLinkingLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/billing/request-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLinkingError(data.error || 'Erro ao enviar código');
        return;
      }

      setLinkingStep('code');
    } catch (error) {
      setLinkingError('Erro de conexão. Tente novamente.');
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleConfirmLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkingError(null);
    setLinkingLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/billing/confirm-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLinkingError(data.error || 'Código inválido');
        return;
      }

      setLinkingStep('success');
      // Refresh subscription data
      fetchSubscription();
    } catch (error) {
      setLinkingError('Erro de conexão. Tente novamente.');
    } finally {
      setLinkingLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Pagamentos
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
          Assinatura e vinculação do pagamento
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Se o e-mail da compra na Kiwify for diferente do seu login, você
          precisa vincular a assinatura para liberar o acesso automaticamente.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription Status Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Status do plano
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Confira se sua assinatura está ativa e quando expira.
          </p>
          <div className="mt-6 space-y-3 text-sm text-[var(--color-text-secondary)]">
            <div className="rounded-xl border border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
              <span>Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  statusClasses[subscription?.status || 'NO_SUBSCRIPTION'] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {SUBSCRIPTION_STATUS_LABELS[subscription?.status as SubscriptionStatus] || 'Sem assinatura'}
              </span>
            </div>

            {subscription?.plan && (
              <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                Plano:{' '}
                <span className="font-semibold text-[var(--color-text-main)]">
                  {subscription.plan.name}
                </span>
              </div>
            )}

            {subscription?.expiresAt && (
              <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                Expira em:{' '}
                <span className="font-semibold text-[var(--color-text-main)]">
                  {formatDate(subscription.expiresAt)}
                </span>
              </div>
            )}

            {subscription?.status === 'GRACE' && subscription?.graceUntil && (
              <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3">
                <p className="font-semibold text-yellow-800">Período de carência</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Sua assinatura venceu, mas você ainda tem acesso até{' '}
                  {formatDate(subscription.graceUntil)}. Renove para não perder o acesso.
                </p>
              </div>
            )}

            {subscription?.kiwifyLinked && (
              <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-800 font-medium">Conta Kiwify vinculada</span>
              </div>
            )}

            <a
              href={process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl border-2 border-[var(--color-primary)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-primary)] text-center transition-all hover:bg-[color:rgba(245,61,45,0.05)]"
            >
              {subscription?.hasActiveSubscription ? 'Renovar assinatura' : 'Assinar agora'}
            </a>
          </div>
        </div>

        {/* Kiwify Linking Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Vincular conta Kiwify
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {subscription?.kiwifyLinked
              ? 'Sua conta Kiwify já está vinculada.'
              : 'Informe o e-mail usado no pagamento para receber o código de validação e liberar o acesso.'}
          </p>

          {!subscription?.kiwifyLinked && linkingStep === 'email' && (
            <form className="mt-6 space-y-4" onSubmit={handleRequestLink}>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                E-mail do pagamento
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@kiwify.com"
                  required
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
                />
              </label>

              {linkingError && (
                <p className="text-sm text-red-600">{linkingError}</p>
              )}

              <button
                type="submit"
                disabled={linkingLoading || !email}
                className="w-full rounded-xl border-2 border-[var(--color-primary)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-primary)] transition-all hover:bg-[color:rgba(245,61,45,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {linkingLoading ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>
          )}

          {!subscription?.kiwifyLinked && linkingStep === 'code' && (
            <form className="mt-6 space-y-4" onSubmit={handleConfirmLink}>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Enviamos um código de 6 dígitos para <strong>{email}</strong>
              </p>

              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                Código de verificação
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)] text-center tracking-[0.5em] outline-none transition-all focus:border-[var(--color-primary)]"
                />
              </label>

              {linkingError && (
                <p className="text-sm text-red-600">{linkingError}</p>
              )}

              <button
                type="submit"
                disabled={linkingLoading || code.length !== 6}
                className="w-full rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {linkingLoading ? 'Verificando...' : 'Confirmar código'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLinkingStep('email');
                  setCode('');
                  setLinkingError(null);
                }}
                className="w-full text-sm text-[var(--color-text-secondary)] hover:underline"
              >
                Usar outro e-mail
              </button>
            </form>
          )}

          {(linkingStep === 'success' || subscription?.kiwifyLinked) && (
            <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-green-800">Conta vinculada com sucesso!</p>
                  <p className="text-sm text-green-700">
                    Seu acesso foi liberado automaticamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!subscription?.kiwifyLinked && linkingStep === 'email' && (
            <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
              Enviaremos um código de 6 dígitos para confirmar a titularidade da
              compra.
            </p>
          )}
        </div>
      </div>

      {/* Plan Details */}
      {subscription?.plan && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)] mb-4">
            Detalhes do seu plano
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[var(--color-border)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {subscription.plan.maxArtesPerDay}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">Artes/dia</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {subscription.plan.maxDownloadsPerDay}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">Downloads/dia</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {subscription.plan.includedMarketplaces}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">Marketplaces</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {subscription.plan.billingCycle === 'MONTHLY' ? 'Mensal' : 'Anual'}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">Ciclo</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 ${subscription.plan.hasBotGeracao ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {subscription.plan.hasBotGeracao ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={subscription.plan.hasBotGeracao ? 'text-green-800' : 'text-gray-500'}>
                  Bot de Geração
                </span>
              </div>
            </div>
            <div className={`rounded-xl p-4 ${subscription.plan.hasBotDownload ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {subscription.plan.hasBotDownload ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={subscription.plan.hasBotDownload ? 'text-green-800' : 'text-gray-500'}>
                  Bot de Download
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
