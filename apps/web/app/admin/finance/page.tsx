'use client';
import { useEffect, useState } from 'react';
import {
  KIWIFY_EVENT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PROCESSING_STATUS_LABELS,
  PaymentStatus,
  ProcessingStatus,
  KiwifyEventType,
} from '@/lib/admin-enums';
import { getAdminToken } from '@/lib/admin-auth';

type FinanceStatusSummary = {
  status: PaymentStatus;
  amount: number;
};

type FinanceSummary = {
  totalRevenue?: number;
  totalPaid?: number;
  byStatus?: FinanceStatusSummary[];
};

type FinancePayment = {
  id: string;
  status: PaymentStatus;
  amount: number | string;
  users?: { email?: string | null } | null;
  user_id?: string | null;
  created_at?: string;
};

type KiwifyEvent = {
  id: string;
  event_type?: keyof typeof KIWIFY_EVENT_TYPE_LABELS | string;
  event_id?: string | null;
  received_at?: string | null;
  processing_status?: ProcessingStatus;
  processing_error?: string | null;
};

type ProcessingStats = {
  total: number;
  processed: number;
  pending: number;
  errors: number;
  successRate: number;
  periodDays: number;
};

type DiscrepancyReport = {
  eventsWithoutPayments: Array<{ eventId: string; transactionId: string; details: string }>;
  paymentsWithoutEvents: Array<{ paymentId: string; transactionId: string; details: string }>;
  statusMismatches: Array<{ eventId: string; paymentId: string; details: string }>;
  totalDiscrepancies: number;
  periodDays: number;
};

const isKiwifyEventType = (
  value: string | undefined
): value is keyof typeof KIWIFY_EVENT_TYPE_LABELS =>
  !!value && value in KIWIFY_EVENT_TYPE_LABELS;

export default function AdminFinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [events, setEvents] = useState<KiwifyEvent[]>([]);
  const [failedEvents, setFailedEvents] = useState<KiwifyEvent[]>([]);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyReport | null>(null);
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'discrepancies'>('overview');

  const toNumber = (value: number | string | null | undefined) => {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    const token = getAdminToken();

    try {
      const [summaryRes, paymentsRes, eventsRes, failedRes, discrepanciesRes, statsRes] =
        await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/payments${
              statusFilter ? `?status=${statusFilter}` : ''
            }`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/kiwify-events`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/failed-events`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/discrepancies?days=7`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/processing-stats?days=30`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      const [summaryData, paymentsData, eventsData, failedData, discrepanciesData, statsData] =
        await Promise.all([
          summaryRes.json(),
          paymentsRes.json(),
          eventsRes.json(),
          failedRes.json(),
          discrepanciesRes.json(),
          statsRes.json(),
        ]);

      setSummary(summaryData.data || {});
      setPayments(paymentsData.data?.payments || []);
      setEvents(eventsData.data?.events || []);
      setFailedEvents(failedData.data || []);
      setDiscrepancies(discrepanciesData.data || null);
      setProcessingStats(statsData.data || null);
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReprocessEvent = async (eventId: string) => {
    setReprocessing(eventId);
    const token = getAdminToken();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/reprocess-event/${eventId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        // Refresh data after reprocessing
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao reprocessar evento');
      }
    } catch (error) {
      alert('Erro de conexão');
    } finally {
      setReprocessing(null);
    }
  };

  const handleRebuildPayment = async (eventId: string) => {
    setReprocessing(eventId);
    const token = getAdminToken();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/rebuild-payment/${eventId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao reconstruir pagamento');
      }
    } catch (error) {
      alert('Erro de conexão');
    } finally {
      setReprocessing(null);
    }
  };

  const paidAmount = summary?.totalRevenue ?? summary?.totalPaid ?? 0;
  const pendingAmount =
    summary?.byStatus?.find((item) => item.status === 'pending')?.amount ?? 0;
  const refundedAmount =
    summary?.byStatus?.find((item) => item.status === 'refunded')?.amount ?? 0;
  const chargebackAmount =
    summary?.byStatus?.find((item) => item.status === 'chargeback')?.amount ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financeiro</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Recebido</p>
          <p className="text-2xl font-bold text-green-600">
            R$ {toNumber(paidAmount).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Pendente</p>
          <p className="text-2xl font-bold text-yellow-600">
            R$ {toNumber(pendingAmount).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Reembolsos</p>
          <p className="text-2xl font-bold text-gray-600">
            R$ {toNumber(refundedAmount).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Estornos</p>
          <p className="text-2xl font-bold text-red-600">
            R$ {toNumber(chargebackAmount).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Processing Stats */}
      {processingStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Estatísticas de Processamento (30 dias)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{processingStats.total}</p>
              <p className="text-sm text-gray-600">Total eventos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{processingStats.processed}</p>
              <p className="text-sm text-gray-600">Processados</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{processingStats.pending}</p>
              <p className="text-sm text-gray-600">Pendentes</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{processingStats.errors}</p>
              <p className="text-sm text-gray-600">Erros</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {processingStats.successRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Taxa sucesso</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Visão Geral' },
            { id: 'events', label: 'Eventos Kiwify' },
            { id: 'discrepancies', label: `Divergências (${discrepancies?.totalDiscrepancies || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payments */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Transações Recentes</h2>
              <select
                className="rounded border border-gray-300 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | '')}
              >
                <option value="">Todos</option>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 text-sm max-h-[400px] overflow-y-auto">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{payment.users?.email || payment.user_id}</p>
                    {payment.created_at && (
                      <p className="text-xs text-gray-500">{formatDate(payment.created_at)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">R$ {toNumber(payment.amount).toFixed(2)}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        payment.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'refunded'
                          ? 'bg-gray-100 text-gray-800'
                          : payment.status === 'chargeback'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                    </span>
                  </div>
                </div>
              ))}
              {!payments.length && <p className="text-gray-500">Nenhuma transação encontrada.</p>}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Webhooks Kiwify Recentes</h2>
            <div className="space-y-2 text-sm max-h-[400px] overflow-y-auto">
              {events.slice(0, 10).map((event) => {
                const eventType = typeof event.event_type === 'string' ? event.event_type : undefined;
                const eventLabel =
                  (isKiwifyEventType(eventType) ? KIWIFY_EVENT_TYPE_LABELS[eventType] : null) ||
                  eventType ||
                  'Evento';
                return (
                  <div key={event.id} className="border-b pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{eventLabel}</p>
                        <p className="text-xs text-gray-500">{event.event_id}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          event.processing_status === 'PROCESSED'
                            ? 'bg-green-100 text-green-800'
                            : event.processing_status === 'ERROR'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {PROCESSING_STATUS_LABELS[event.processing_status as ProcessingStatus] ||
                          event.processing_status}
                      </span>
                    </div>
                    {event.received_at && (
                      <p className="text-xs text-gray-400 mt-1">{formatDate(event.received_at)}</p>
                    )}
                  </div>
                );
              })}
              {!events.length && <p className="text-gray-500">Nenhum webhook recente.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Failed Events */}
          {failedEvents.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3 text-red-600">
                Eventos com Erro ({failedEvents.length})
              </h2>
              <div className="space-y-3">
                {failedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border border-red-200 rounded-lg p-4 bg-red-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{event.event_type}</p>
                        <p className="text-sm text-gray-600">{event.event_id}</p>
                        {event.processing_error && (
                          <p className="text-sm text-red-600 mt-1">{event.processing_error}</p>
                        )}
                        {event.received_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(event.received_at)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReprocessEvent(event.event_id!)}
                          disabled={reprocessing === event.event_id}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {reprocessing === event.event_id ? 'Processando...' : 'Reprocessar'}
                        </button>
                        <button
                          onClick={() => handleRebuildPayment(event.event_id!)}
                          disabled={reprocessing === event.event_id}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Reconstruir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Events */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Todos os Eventos</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-left py-2">Event ID</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Recebido em</th>
                    <th className="text-left py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const eventType =
                      typeof event.event_type === 'string' ? event.event_type : undefined;
                    const eventLabel =
                      (isKiwifyEventType(eventType)
                        ? KIWIFY_EVENT_TYPE_LABELS[eventType]
                        : null) ||
                      eventType ||
                      'Evento';
                    return (
                      <tr key={event.id} className="border-b">
                        <td className="py-2">{eventLabel}</td>
                        <td className="py-2 font-mono text-xs">{event.event_id}</td>
                        <td className="py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              event.processing_status === 'PROCESSED'
                                ? 'bg-green-100 text-green-800'
                                : event.processing_status === 'ERROR'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {PROCESSING_STATUS_LABELS[
                              event.processing_status as ProcessingStatus
                            ] || event.processing_status}
                          </span>
                        </td>
                        <td className="py-2">
                          {event.received_at ? formatDate(event.received_at) : '-'}
                        </td>
                        <td className="py-2">
                          {event.processing_status === 'ERROR' && (
                            <button
                              onClick={() => handleReprocessEvent(event.event_id!)}
                              disabled={reprocessing === event.event_id}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Reprocessar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!events.length && (
                <p className="text-gray-500 text-center py-4">Nenhum evento encontrado.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discrepancies Tab */}
      {activeTab === 'discrepancies' && discrepancies && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              Divergências (últimos {discrepancies.periodDays} dias)
            </h2>

            {discrepancies.totalDiscrepancies === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="w-16 h-16 text-green-500 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg font-medium text-green-600">
                  Nenhuma divergência encontrada!
                </p>
                <p className="text-sm text-gray-500">
                  Todos os pagamentos estão sincronizados com os eventos Kiwify.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Events without payments */}
                {discrepancies.eventsWithoutPayments.length > 0 && (
                  <div>
                    <h3 className="font-medium text-red-600 mb-2">
                      Eventos sem pagamento ({discrepancies.eventsWithoutPayments.length})
                    </h3>
                    <div className="space-y-2">
                      {discrepancies.eventsWithoutPayments.map((item, idx) => (
                        <div
                          key={idx}
                          className="border border-red-200 rounded p-3 bg-red-50 flex justify-between items-center"
                        >
                          <div>
                            <p className="text-sm">{item.details}</p>
                            <p className="text-xs text-gray-500">
                              Transaction: {item.transactionId}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRebuildPayment(item.eventId)}
                            disabled={reprocessing === item.eventId}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            Reconstruir
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payments without events */}
                {discrepancies.paymentsWithoutEvents.length > 0 && (
                  <div>
                    <h3 className="font-medium text-yellow-600 mb-2">
                      Pagamentos sem evento ({discrepancies.paymentsWithoutEvents.length})
                    </h3>
                    <div className="space-y-2">
                      {discrepancies.paymentsWithoutEvents.map((item, idx) => (
                        <div
                          key={idx}
                          className="border border-yellow-200 rounded p-3 bg-yellow-50"
                        >
                          <p className="text-sm">{item.details}</p>
                          <p className="text-xs text-gray-500">
                            Transaction: {item.transactionId}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status mismatches */}
                {discrepancies.statusMismatches.length > 0 && (
                  <div>
                    <h3 className="font-medium text-orange-600 mb-2">
                      Status divergente ({discrepancies.statusMismatches.length})
                    </h3>
                    <div className="space-y-2">
                      {discrepancies.statusMismatches.map((item, idx) => (
                        <div
                          key={idx}
                          className="border border-orange-200 rounded p-3 bg-orange-50"
                        >
                          <p className="text-sm">{item.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
