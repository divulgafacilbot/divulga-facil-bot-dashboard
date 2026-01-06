"use client";

import { useMemo, useState, useEffect } from "react";
import { showToast } from "@/lib/toast";

type Attachment = { id: string; name: string; url: string };

type SupportMessage = {
  id: string;
  sender_role: "user" | "admin";
  message: string;
  attachments?: Attachment[];
  created_at?: string;
};

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: "open" | "in_progress" | "closed" | "archived";
  created_at: string;
  updated_at: string;
  support_messages?: SupportMessage[];
};

const FAQ_ITEMS = [
  {
    question: "O que o Bot de Artes entrega quando eu envio um link?",
    answer:
      "Ele gera um card para Telegram com arte e texto, uma arte para story (9:16) e uma arte quadrada otimizada para WhatsApp, seguindo o template definido no seu dashboard.",
  },
  {
    question: "Como funciona o Bot de Download?",
    answer:
      "Basta enviar o link do produto no Telegram. O bot identifica as imagens e arquivos disponiveis e envia os downloads automaticamente na conversa.",
  },
  {
    question: "Preciso configurar um template antes de usar o Bot de Artes?",
    answer:
      "Nao. Voce pode comecar com o template padrao e ajustar cores, fontes e layout no dashboard quando quiser.",
  },
  {
    question: "Posso contratar apenas um bot?",
    answer:
      "Sim. Voce pode assinar somente o Bot de Artes, somente o Bot de Download ou o pacote com os dois.",
  },
  {
    question: "Meu pagamento foi feito com outro e-mail. O que fazer?",
    answer:
      "Acesse a area de pagamentos e vincule a assinatura usando o e-mail da compra na Kiwify para liberar o acesso automaticamente.",
  },
  {
    question: "Quanto tempo leva para gerar as artes?",
    answer:
      "Em geral, as artes ficam prontas em segundos depois que o bot processa o link.",
  },
  {
    question: "Quais tipos de links o bot aceita?",
    answer:
      "Links de produtos e paginas de afiliado sao suportados. O bot busca os dados automaticamente para gerar a arte ou baixar as imagens.",
  },
];

const STATUS_LABELS: Record<SupportTicket["status"], string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  closed: "Fechado",
  archived: "Arquivado",
};

const CATEGORY_OPTIONS = [
  "Bot de artes",
  "Bot de download",
  "Financeiro",
  "Material promocional",
  "Outras duvidas",
];

export default function FaqSupportPage() {
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "",
    subject: "",
    message: "",
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [previewImage, setPreviewImage] = useState<Attachment | null>(null);

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return FAQ_ITEMS;
    return FAQ_ITEMS.filter((item) => {
      const question = item.question.toLowerCase();
      const answer = item.answer.toLowerCase();
      return question.includes(query) || answer.includes(query);
    });
  }, [search]);

  const latestMessage = (ticket: SupportTicket) => ticket.support_messages?.[0];

  const fetchTickets = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/support/tickets`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const nextTickets = Array.isArray(data?.data) ? data.data : [];
        setTickets(nextTickets);
      });
  };

  useEffect(() => {
    fetchTickets();
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/support/tickets/closed/seen`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).catch(() => null);
  }, []);

  const resetForm = () => {
    setForm({ category: "", subject: "", message: "" });
    setAttachments([]);
    setEditingTicketId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (ticket: SupportTicket) => {
    const message = latestMessage(ticket)?.message || "";
    setForm({
      category: ticket.category,
      subject: ticket.subject,
      message,
    });
    const existingAttachments = latestMessage(ticket)?.attachments || [];
    setAttachments(
      existingAttachments.map((attachment, index) => ({
        id: `${ticket.id}-${index}`,
        ...attachment,
      }))
    );
    setEditingTicketId(ticket.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const payload = {
      subject: form.subject.trim(),
      category: form.category,
      message: form.message.trim(),
      attachments: attachments.map(({ name, url }) => ({ name, url })),
    };

    const url = editingTicketId
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/support/tickets/${editingTicketId}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/support/tickets`;

    const method = editingTicketId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Falha ao abrir ticket");
      }

      showToast("Ticket enviado com sucesso!", "success");
      setIsModalOpen(false);
      resetForm();
      fetchTickets();
    } catch (error) {
      showToast("Erro ao enviar ticket. Tente novamente.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    const confirmed = window.confirm("Tem certeza que deseja cancelar este ticket?");
    if (!confirmed) return;

    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/support/tickets/${ticketId}/close`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    fetchTickets();
  };

  const handleArchiveTicket = async (ticketId: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/support/tickets/${ticketId}/archive`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    fetchTickets();
  };

  const handleAttachmentChange = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        if (!result) return;
        setAttachments((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name: file.name, url: result },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const isSubmitDisabled =
    !form.category || !form.subject.trim() || !form.message.trim();

  return (
    <>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          FAQ e Suporte
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
          Tire suas duvidas e encontre ajuda rapida
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Respostas diretas sobre uso dos bots, configuracao do dashboard e
          vinculacao da assinatura.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
          Perguntas frequentes
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Busque por termos como "telegram", "pagamento" ou "template".
        </p>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar duvida"
          className="mt-4 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
        />
        <div className="mt-6 space-y-4">
          {filteredFaqs.map((item) => {
            const isOpen = openFaqs[item.question] || false;
            return (
            <div
              key={item.question}
              className="rounded-2xl border border-[var(--color-border)] px-5 py-4"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() =>
                  setOpenFaqs((prev) => ({
                    ...prev,
                    [item.question]: !isOpen,
                  }))
                }
              >
                <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
                  {item.question}
                </h3>
                <svg
                  className={`h-4 w-4 text-[var(--color-text-secondary)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {item.answer}
                </p>
              )}
            </div>
            );
          })}
          {!filteredFaqs.length && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Nenhuma duvida encontrada para "{search}".
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          id="abrir-ticket-de-suporte"
          className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Abrir ticket de suporte
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Suas duvidas nao foram resolvidas, consulte com o nosso time.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-6 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white"
          >
            Abrir ticket de suporte
          </button>
        </div>

        <div
          id="meus-tickets-de-suporte"
          className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Meus tickets de suporte
          </h2>
          <div className="mt-6 space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-[var(--color-border)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
                      {ticket.subject}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      Data de abertura: {new Date(ticket.updated_at || ticket.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="mt-1 text-[11px] italic text-[var(--color-text-secondary)]">
                      Id: {ticket.id}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </span>
                </div>
                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                  {latestMessage(ticket)?.message || "Sem detalhes registrados."}
                </p>
                {latestMessage(ticket)?.attachments?.length ? (
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--color-primary)]">
                    {latestMessage(ticket)?.attachments?.map((attachment, index) => (
                      <button
                        key={`${attachment.name}-${index}`}
                        type="button"
                        className="underline"
                        onClick={() => setPreviewImage({ id: `${ticket.id}-${index}`, ...attachment })}
                      >
                        {attachment.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  {ticket.status === "closed" ? (
                    <>
                      <button
                        type="button"
                        className="rounded border border-[var(--color-border)] px-3 py-2 text-xs"
                        onClick={() => handleArchiveTicket(ticket.id)}
                      >
                        Marcar como concluido
                      </button>
                      <button
                        type="button"
                        className="rounded border border-[var(--color-border)] px-3 py-2 text-xs"
                        onClick={() => openEditModal(ticket)}
                      >
                        Reabrir
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rounded border border-[var(--color-border)] px-3 py-2 text-xs"
                        onClick={() => openEditModal(ticket)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded border border-[var(--color-border)] px-3 py-2 text-xs text-gray-600"
                        onClick={() => handleCloseTicket(ticket.id)}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!tickets.length && (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Voce ainda nao abriu nenhum ticket.
              </p>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            id="modal-de-abrir-ticket-de-suporte"
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-semibold">
              {editingTicketId ? "Atualizar ticket de suporte" : "Abrir ticket de suporte"}
            </h2>
            <div className="mt-4 space-y-4 text-sm">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Suporte referente a qual parte
                </span>
                <select
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                >
                  <option value="">Selecione</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Titulo
                </span>
                <input
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                  value={form.subject}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, subject: event.target.value }))
                  }
                  placeholder="Resumo do problema"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Texto
                </span>
                <textarea
                  className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)]"
                  value={form.message}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, message: event.target.value }))
                  }
                  rows={4}
                  placeholder="Explique o que esta acontecendo"
                />
              </label>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Anexar imagens/prints (opcional)
                </span>
                <div className="mt-2 flex items-center gap-3">
                  <label className="cursor-pointer rounded-xl border-2 border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-text-main)]">
                    Escolher arquivos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => handleAttachmentChange(event.target.files)}
                    />
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--color-text-secondary)]">{attachment.name}</span>
                        <button
                          type="button"
                          className="text-red-500"
                          onClick={() => removeAttachment(attachment.id)}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded border border-[var(--color-border)] px-4 py-2 text-sm text-gray-600"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitDisabled}
                onClick={handleSubmit}
                className={`rounded px-4 py-2 text-sm font-semibold text-white transition ${
                  isSubmitDisabled
                    ? "bg-gray-300"
                    : "bg-[var(--color-primary)]"
                } ${isSubmitting ? "opacity-80" : ""}`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="loading" />
                    Enviando
                  </span>
                ) : (
                  "Abrir Ticket"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}
