'use client';
import { getAdminToken } from '@/lib/admin-auth';
import {
  SUPPORT_TICKET_STATUS_LABELS,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@/lib/admin-enums';
import { useEffect, useState } from 'react';
import { showToast } from '@/lib/toast';

export default function AdminSupportPage() {
  type SupportMessage = {
    id: string;
    sender_role: 'user' | 'admin';
    message: string;
    attachments?: { name: string; url: string }[];
    created_at?: string;
  };
  type SupportTicket = {
    id: string;
    subject: string;
    status: SupportTicketStatus;
    priority: string;
    category: string;
    status_label?: string;
    priority_label?: string;
    support_messages?: SupportMessage[];
    users?: { id: string; email: string };
  };
  type SupportFilters = { status: SupportTicketStatus | ''; category: string };
  type TicketAction = 'reply' | 'resolve' | 'reopen' | 'priority' | 'in-progress';
  type TicketActionPayload = { message?: string; priority?: SupportTicketPriority; resolution?: string };

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filters, setFilters] = useState<SupportFilters>({ status: 'open', category: '' });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [previewImage, setPreviewImage] = useState<{ name: string; url: string } | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'nao_resolvido' | 'resolvido'>('nao_resolvido');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const latestUserMessage = (ticket?: SupportTicket | null) => {
    if (!ticket?.support_messages?.length) return null;
    return [...ticket.support_messages]
      .reverse()
      .find((msg) => msg.sender_role === 'user') || null;
  };

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const fetchTickets = () => {
    const token = getAdminToken();
    const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/support/tickets`);
    if (filters.status) url.searchParams.append('status', filters.status);
    if (filters.category) url.searchParams.append('category', filters.category);
    fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const nextTickets = Array.isArray(data?.data?.tickets) ? data.data.tickets : [];
        setTickets(nextTickets);
      });
  };

  const fetchTicketDetail = async (ticketId: string) => {
    const token = getAdminToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/support/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      setSelectedTicket(data.data);
    }
  };

  const handleAction = async (action: TicketAction, ticketId: string, payload?: TicketActionPayload) => {
    const token = getAdminToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/support/tickets/${ticketId}/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) {
      showToast('Erro ao atualizar ticket.', 'error');
      return;
    }
    fetchTicketDetail(ticketId);
    fetchTickets();
    if (action === 'resolve') {
      showToast('Ticket finalizado com sucesso!', 'success');
    } else if (action === 'in-progress') {
      showToast('Ticket marcado como em andamento.', 'success');
    } else if (action === 'reply') {
      showToast('Resposta enviada com sucesso.', 'success');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tickets de Suporte</h1>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <select
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          value={filters.status}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, status: e.target.value as SupportTicketStatus | '' }))
          }
        >
          <option value="">Todos</option>
          {Object.entries(SUPPORT_TICKET_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder="Categoria"
          value={filters.category}
          onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
        />
      </div>
      <div id='lista-de-tickets-em-aberto' className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id='card-de-ticket' className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => fetchTicketDetail(ticket.id)}
              className="w-full cursor-pointer text-left bg-white p-4 rounded-lg shadow transition hover:shadow-lg hover:border hover:border-[var(--color-primary)]"
            >
              <h3 className="font-semibold">{ticket.subject}</h3>
              <p className="text-sm text-gray-600">
                Status: {ticket.status_label || SUPPORT_TICKET_STATUS_LABELS[ticket.status] || ticket.status}
              </p>
              <p
                className="mt-2 text-sm text-gray-600"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {ticket.support_messages?.[0]?.message || 'Sem mensagem registrada.'}
              </p>
            </button>
          ))}
          {!tickets.length && (
            <div className="rounded-lg border border-[var(--color-border)] bg-white p-6 text-sm text-gray-600">
              Nenhum ticket encontrado.
            </div>
          )}
        </div>
        <div id='detalhes-do-ticket-de-suporte' className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">
            {selectedTicket ? selectedTicket.subject : 'Detalhes do ticket'}
          </h2>
          {!selectedTicket && <p className="text-sm text-gray-600">Selecione um ticket.</p>}
          {selectedTicket && (
            <>
              <p className="text-sm text-gray-600">
                Usuario: {selectedTicket.users?.email || 'Sem e-mail'}
              </p>
              <p className="mt-3 text-sm text-gray-700">
                {latestUserMessage(selectedTicket)?.message || 'Sem mensagem registrada.'}
              </p>
              {latestUserMessage(selectedTicket)?.attachments?.length ? (
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--color-primary)]">
                  {latestUserMessage(selectedTicket)?.attachments?.map((attachment) => (
                    <button
                      key={attachment.name}
                      type="button"
                      className="underline"
                      onClick={() => setPreviewImage(attachment)}
                    >
                      {attachment.name}
                    </button>
                  ))}
                </div>
              ) : null}
              {['closed', 'archived'].includes(selectedTicket.status) ? null : (
                <>
                  <textarea
                    className="mt-3 w-full rounded border border-[var(--color-border)] p-2 text-sm"
                    placeholder="Responder..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div id="o-que-fazer-com-o-ticket-btn" className="mt-3 space-y-3">
                    <div className="flex flex-col gap-2 text-sm text-gray-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status-resolution"
                          checked={resolutionStatus === 'nao_resolvido'}
                          onChange={() => setResolutionStatus('nao_resolvido')}
                        />
                        Nao resolvido
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status-resolution"
                          checked={resolutionStatus === 'resolvido'}
                          onChange={() => setResolutionStatus('resolvido')}
                        />
                        Resolvido
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded bg-[var(--color-primary)] px-3 py-1 text-sm text-white"
                        disabled={isFinalizing}
                        onClick={async () => {
                          if (isFinalizing) return;
                          setIsFinalizing(true);
                          const resolutionText =
                            reply ||
                            (resolutionStatus === 'resolvido'
                              ? 'Ticket resolvido.'
                              : 'Ticket finalizado com pendencias.');
                          await handleAction('resolve', selectedTicket.id, { resolution: resolutionText });
                          setReply('');
                          setSelectedTicket(null);
                          fetchTickets();
                          setIsFinalizing(false);
                        }}
                      >
                        {isFinalizing ? (
                          <span className="flex items-center gap-2">
                            <span className="loading" />
                            Finalizando
                          </span>
                        ) : (
                          'Responder e Finalizar'
                        )}
                      </button>
                      <button
                        className="rounded border border-[var(--color-border)] px-3 py-1 text-sm"
                        onClick={async () => {
                          const messageToSend = reply.trim() || 'Ticket marcado como em andamento.';
                          await handleAction('reply', selectedTicket.id, { message: messageToSend });
                          setReply('');
                          await handleAction('in-progress', selectedTicket.id);
                        }}
                      >
                        Marcar como em andamento
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl rounded-lg bg-white p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 text-lg text-gray-500 hover:text-gray-800"
              aria-label="Fechar"
            >
              ×
            </button>
            <img src={previewImage.url} alt={previewImage.name} className="max-h-[80vh] rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
