export default function BotsPage() {
  return (
    <>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Meus bots
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
          Seus bots e acesso por plano
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Aqui você acompanha quais bots estão liberados e conecta sua conta do
          Telegram para começar a usar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          {
            title: "Bot de Artes (marketplaces)",
            description:
              "Gera artes prontas para feed, story e WhatsApp a partir de links.",
            status: "Disponível no plano",
            accent: "var(--color-primary)",
          },
          {
            title: "Bot de Download (redes sociais)",
            description:
              "Baixa mídia de Instagram, TikTok e Pinterest com 1 link.",
            status: "Disponível no plano",
            accent: "var(--color-info)",
          },
        ].map((bot) => (
          <div
            key={bot.title}
            className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
                {bot.title}
              </h2>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: bot.accent }}
              >
                {bot.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              {bot.description}
            </p>
            <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs text-[var(--color-text-secondary)]">
              Conecte no Telegram com um token temporário e envie:{" "}
              <span className="font-semibold text-[var(--color-text-main)]">
                /start SEU_TOKEN
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <h2 className="text-xl font-bold text-[var(--color-text-main)]">
          Conectar Telegram
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Gere o token do bot contratado e conecte sua conta para liberar o uso.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            "Gerar token do Bot de Artes",
            "Gerar token do Bot de Download",
          ].map((label) => (
            <button
              key={label}
              className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-left text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
