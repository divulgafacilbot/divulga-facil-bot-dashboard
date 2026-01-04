'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  SUPPORT_TICKET_PRIORITY_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@/lib/admin-enums';
import { getAdminToken } from '@/lib/admin-auth';

export default function AdminSupportPage() {
  type SupportMessage = {
    id: string;
    sender_role: 'user' | 'admin';
    message: string;
  };
  type SupportTicket = {
    id: string;
    subject: string;
    status: SupportTicketStatus;
    priority: SupportTicketPriority;
    category: string;
    status_label?: string;
    priority_label?: string;
    support_messages?: SupportMessage[];
    isMock?: boolean;
  };
  type SupportFilters = { status: SupportTicketStatus | ''; category: string };
  type TicketAction = 'reply' | 'resolve' | 'reopen' | 'priority';
  type TicketActionPayload = { message?: string; priority?: SupportTicketPriority; resolution?: string };

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filters, setFilters] = useState<SupportFilters>({ status: '', category: '' });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');

  const mockTickets = useMemo<SupportTicket[]>(
    () => [
      {
        id: 'mock-1',
        isMock: true,
        subject: 'Erro ao renderizar template no dashboard',
        status: 'open',
        priority: 'high',
        category: 'Templates',
        support_messages: [
          {
            id: 'mock-1-1',
            sender_role: 'user',
            message: 'O template novo nao aparece na lista, preciso de ajuda.',
          },
          {
            id: 'mock-1-2',
            sender_role: 'admin',
            message: 'Vamos verificar a categoria e o status de ativacao do template.',
          },
        ],
      },
      {
        id: 'mock-2',
        isMock: true,
        subject: 'Falha no download do Instagram',
        status: 'open',
        priority: 'medium',
        category: 'Bot de download',
        support_messages: [
          {
            id: 'mock-2-1',
            sender_role: 'user',
            message: 'O bot baixou apenas uma imagem do reel.',
          },
          {
            id: 'mock-2-2',
            sender_role: 'admin',
            message: 'Abrimos uma investigacao e vamos ajustar o scraper.',
          },
        ],
      },
      {
        id: 'mock-3',
        isMock: true,
        subject: 'Cobrança em duplicidade',
        status: 'resolved',
        priority: 'high',
        category: 'Financeiro',
        support_messages: [
          {
            id: 'mock-3-1',
            sender_role: 'user',
            message: 'Meu cartao foi cobrado duas vezes neste mes.',
          },
          {
            id: 'mock-3-2',
            sender_role: 'admin',
            message: 'Identificamos a duplicidade e realizamos o estorno.',
          },
        ],
      },
      {
        id: 'mock-4',
        isMock: true,
        subject: 'Problema ao vincular bot',
        status: 'open',
        priority: 'low',
        category: 'Bots',
        support_messages: [
          {
            id: 'mock-4-1',
            sender_role: 'user',
            message: 'Nao consigo vincular o bot, o token expira.',
          },
          {
            id: 'mock-4-2',
            sender_role: 'admin',
            message: 'Verifique se o token foi copiado completo e tente novamente.',
          },
        ],
      },
      {
        id: 'mock-5',
        isMock: true,
        subject: 'Template nao aparece para colaborador',
        status: 'open',
        priority: 'medium',
        category: 'Permissoes',
        support_messages: [
          {
            id: 'mock-5-1',
            sender_role: 'user',
            message: 'O colaborador nao ve a aba de templates.',
          },
          {
            id: 'mock-5-2',
            sender_role: 'admin',
            message: 'Confirme se a permissao de templates foi ativada.',
          },
        ],
      },
      {
        id: 'mock-6',
        isMock: true,
        subject: 'Erro na renovacao da assinatura',
        status: 'resolved',
        priority: 'medium',
        category: 'Assinatura',
        support_messages: [
          {
            id: 'mock-6-1',
            sender_role: 'user',
            message: 'A renovacao falhou e perdi acesso.',
          },
          {
            id: 'mock-6-2',
            sender_role: 'admin',
            message: 'Assinatura reativada e acesso restaurado.',
          },
        ],
      },
    ],
    []
  );

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
        if (nextTickets.length) {
          setTickets(nextTickets);
          return;
        }
        const filteredMock = mockTickets.filter((ticket) => {
          const statusOk = filters.status ? ticket.status === filters.status : true;
          const categoryOk = filters.category
            ? ticket.category.toLowerCase().includes(filters.category.toLowerCase())
            : true;
          return statusOk && categoryOk;
        });
        setTickets(filteredMock);
      });
  };

  const fetchTicketDetail = async (ticketId: string) => {
    if (ticketId.startsWith('mock-')) {
      const ticket = tickets.find((item) => item.id === ticketId);
      setSelectedTicket(ticket || null);
      return;
    }
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
    if (ticketId.startsWith('mock-')) {
      setTickets((prev) =>
        prev.map((ticket) => {
          if (ticket.id !== ticketId) return ticket;
          if (action === 'reply' && payload?.message) {
            return {
              ...ticket,
              support_messages: [
                ...(ticket.support_messages || []),
              {
                id: `mock-${ticketId}-reply-${Date.now()}`,
                sender_role: 'admin',
                message: payload.message,
              },
            ],
          };
        }
        if (action === 'resolve') return { ...ticket, status: 'resolved' };
        if (action === 'reopen') return { ...ticket, status: 'open' };
        if (action === 'priority') return { ...ticket, priority: payload?.priority || ticket.priority };
        return ticket;
      })
    );
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== ticketId) return prev;
        if (action === 'reply' && payload?.message) {
          return {
            ...prev,
            support_messages: [
              ...(prev.support_messages || []),
              {
                id: `mock-${ticketId}-reply-${Date.now()}`,
                sender_role: 'admin',
                message: payload.message,
              },
            ],
          };
        }
        if (action === 'resolve') return { ...prev, status: 'resolved' };
        if (action === 'reopen') return { ...prev, status: 'open' };
        if (action === 'priority') return { ...prev, priority: payload?.priority || prev.priority };
        return prev;
      });
      return;
    }
    const token = getAdminToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/support/tickets/${ticketId}/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    fetchTicketDetail(ticketId);
    fetchTickets();
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
          <option value="">Status</option>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold">{ticket.subject}</h3>
              <p className="text-sm text-gray-600">
                Status: {ticket.status_label || SUPPORT_TICKET_STATUS_LABELS[ticket.status] || ticket.status}
              </p>
              <p className="text-sm text-gray-600">
                Prioridade: {ticket.priority_label || SUPPORT_TICKET_PRIORITY_LABELS[ticket.priority] || ticket.priority}
              </p>
              <button
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                onClick={() => fetchTicketDetail(ticket.id)}
              >
                Ver detalhes
              </button>
            </div>
          ))}
          {!tickets.length && (
            <div className="rounded-lg border border-[var(--color-border)] bg-white p-6 text-sm text-gray-600">
              Nenhum ticket encontrado.
            </div>
          )}
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Conversa</h2>
          {!selectedTicket && <p className="text-sm text-gray-600">Selecione um ticket.</p>}
          {selectedTicket && (
            <>
              <div className="space-y-2 text-sm text-gray-700 max-h-64 overflow-y-auto">
                {selectedTicket.support_messages?.map((msg) => (
                  <div key={msg.id} className="border-b pb-2">
                    <p className="font-semibold">{msg.sender_role}</p>
                    <p>{msg.message}</p>
                  </div>
                ))}
              </div>
              <textarea
                className="mt-3 w-full rounded border border-[var(--color-border)] p-2 text-sm"
                placeholder="Responder..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded bg-[var(--color-primary)] px-3 py-1 text-sm text-white"
                  onClick={() => {
                    handleAction('reply', selectedTicket.id, { message: reply });
                    setReply('');
                  }}
                >
                  Responder
                </button>
                <button
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-sm"
                  onClick={() => handleAction('resolve', selectedTicket.id, { resolution: 'Resolvido' })}
                >
                  Resolver
                </button>
                <button
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-sm"
                  onClick={() => handleAction('reopen', selectedTicket.id)}
                >
                  Reabrir
                </button>
                <button
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-sm"
                  onClick={() => handleAction('priority', selectedTicket.id, { priority: 'high' })}
                >
                  Prioridade alta
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
