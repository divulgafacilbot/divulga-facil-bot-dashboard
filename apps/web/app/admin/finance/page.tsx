'use client';
import { useEffect, useState } from 'react';
import { KIWIFY_EVENT_TYPE_LABELS, PAYMENT_STATUS_LABELS, PaymentStatus } from '@/lib/admin-enums';
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
};

type KiwifyEvent = {
  id: string;
  event_type?: keyof typeof KIWIFY_EVENT_TYPE_LABELS | string;
  event_type_label?: string | null;
  event_id?: string | null;
  received_at?: string | null;
};

type FinanceDiscrepancies = {
  paymentsWithoutKiwifyEvent?: { id?: string }[];
  kiwifyEventsWithoutPayment?: { id?: string }[];
  statusMismatches?: { id?: string }[];
};

export default function AdminFinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [events, setEvents] = useState<KiwifyEvent[]>([]);
  const [discrepancies, setDiscrepancies] = useState<FinanceDiscrepancies | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');

  const toNumber = (value: number | string | null | undefined) => {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  useEffect(() => {
    const token = getAdminToken();
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setSummary(data.data || {}));

    const paymentsUrl = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/payments`);
    if (statusFilter) paymentsUrl.searchParams.append('status', statusFilter);
    fetch(paymentsUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPayments(data.data?.payments || []));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/kiwify-events`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setEvents(data.data?.events || []));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/finance/discrepancies`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setDiscrepancies(data.data || null));
  }, [statusFilter]);

  const paidAmount =
    summary?.totalRevenue ??
    summary?.totalPaid ??
    0;
  const pendingAmount =
    summary?.byStatus?.find((item) => item.status === 'pending')?.amount ?? 0;
  const refundedAmount =
    summary?.byStatus?.find((item) => item.status === 'refunded')?.amount ?? 0;
  const paidAmountNumber = toNumber(paidAmount);
  const pendingAmountNumber = toNumber(pendingAmount);
  const refundedAmountNumber = toNumber(refundedAmount);
  const discrepanciesList = discrepancies
    ? [
        {
          label: 'Pagamentos sem evento',
          count: discrepancies.paymentsWithoutKiwifyEvent?.length || 0,
        },
        {
          label: 'Eventos sem pagamento',
          count: discrepancies.kiwifyEventsWithoutPayment?.length || 0,
        },
        {
          label: 'Status divergente',
          count: discrepancies.statusMismatches?.length || 0,
        },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Financeiro</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Recebido</p>
          <p className="text-2xl font-bold">R$ {paidAmountNumber.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Pendente</p>
          <p className="text-2xl font-bold">R$ {pendingAmountNumber.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Reembolsos</p>
          <p className="text-2xl font-bold">R$ {refundedAmountNumber.toFixed(2)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-500">Nota: Dados de mock Kiwify para desenvolvimento</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Transações</h2>
            <select
              className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | '')}
            >
              <option value="">Status</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 text-sm text-gray-700 max-h-[500px] overflow-y-auto pr-1">
            {payments.map((payment) => (
              <div key={payment.id} className="flex justify-between border-b pb-2">
                <span>{payment.users?.email || payment.user_id}</span>
                <span>{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status} · R$ {toNumber(payment.amount).toFixed(2)}</span>
              </div>
            ))}
            {!payments.length && <p>Nenhuma transação.</p>}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Webhooks Kiwify recentes</h2>
          <div className="space-y-2 text-sm text-gray-700 max-h-[500px] overflow-y-auto pr-1">
            {events.map((event) => {
              const eventType = event.event_type;
              const eventLabel =
                event.event_type_label ||
                (eventType && eventType in KIWIFY_EVENT_TYPE_LABELS
                  ? KIWIFY_EVENT_TYPE_LABELS[eventType]
                  : null) ||
                eventType ||
                'Evento';
              return (
              <div key={event.id} className="flex flex-col border-b pb-2">
                <span className="font-semibold">
                  {eventLabel}
                </span>
                <span>{event.event_id}</span>
                {event.received_at && <span>{formatDate(event.received_at)}</span>}
              </div>
              );
            })}
            {!events.length && <p>Nenhum webhook recente.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Divergências</h2>
        <div className="space-y-2 text-sm text-gray-700 max-h-[500px] overflow-y-auto pr-1">
          {discrepanciesList.map((item) => (
            <div key={item.label} className="flex justify-between border-b pb-2">
              <span>{item.label}</span>
              <span>{item.count}</span>
            </div>
          ))}
          {!discrepanciesList.length && <p>Nenhuma divergência.</p>}
        </div>
      </div>
    </div>
  );
}
