'use client';
import { useState, useEffect } from 'react';
import { SupportTicketCategory, SupportTicketStatus } from '@/lib/admin-enums';

export default function UserSupportPage() {
  type SupportTicket = {
    id: string;
    subject: string;
    status: SupportTicketStatus;
    category: SupportTicketCategory;
    created_at: string;
  };

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('general');
  const [message, setMessage] = useState('');
  const categoryLabels: Record<SupportTicketCategory, string> = {
    general: 'Geral',
    technical: 'Técnico',
    billing: 'Cobrança',
    feature_request: 'Solicitação de Recurso',
  };
  const statusClasses: Record<SupportTicketStatus, string> = {
    open: 'bg-green-100 text-green-800',
    resolved: 'bg-gray-100 text-gray-800',
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/user/support/tickets`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => setTickets(data.data || []));
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/user/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ subject, category, message })
    });
    setShowCreate(false);
    setSubject('');
    setMessage('');
    // Refresh tickets
    window.location.reload();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Suporte</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Criar Ticket
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Novo Ticket</h2>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={4}
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
                Criar
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border rounded-md"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between">
              <h3 className="font-semibold">{ticket.subject}</h3>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  statusClasses[ticket.status] || 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {ticket.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Categoria: {categoryLabels[ticket.category] ?? ticket.category}
            </p>
            <p className="text-sm text-gray-600">Criado: {new Date(ticket.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
