'use client';
import { useState, useEffect } from 'react';
import { PAYMENT_STATUS_LABELS, PaymentStatus } from '@/lib/admin-enums';

export default function UserFinancePage() {
  type Subscription = {
    plan?: { name?: string | null } | null;
    status?: string | null;
    expires_at?: string | null;
  };
  type Payment = {
    id: string;
    created_at: string;
    amount: number;
    status: PaymentStatus;
  };

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const paymentStatusClasses: Record<PaymentStatus, string> = {
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/user/finance/subscription`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => setSubscription(data.data));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/user/finance/payments`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => setPayments(data.data || []));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Financeiro</h1>

      {subscription && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Assinatura Atual</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Plano</p>
              <p className="font-semibold">{subscription.plan?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold">{subscription.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expira em</p>
              <p className="font-semibold">{subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Histórico de Pagamentos</h2>
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Data</th>
              <th className="text-left py-2">Valor</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b">
                <td className="py-2">{new Date(payment.created_at).toLocaleDateString()}</td>
                <td className="py-2">R$ {payment.amount}</td>
                <td className="py-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      paymentStatusClasses[payment.status] || 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm text-gray-500">Nota: Dados de mock para desenvolvimento</p>
      </div>
    </div>
  );
}
