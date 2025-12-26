export default function TemplatesPage() {
  return (
    <>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Editar templates
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-main)]">
          Padrão visual das suas artes
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Ajuste template, cores, cupom e CTA para manter sua identidade visual
          em todas as artes geradas pelo bot.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Template ativo
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Escolha o layout que define posição de imagem, preço, título e
            cupom.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {["Template A", "Template B", "Template C"].map((label) => (
              <button
                key={label}
                className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-6 text-center text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Paleta e destaque
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Defina cores de fundo, texto e preço para manter consistência.
          </p>
          <div className="mt-6 space-y-3 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-4 py-3">
              Cor de fundo
              <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-semibold text-white">
                #F53D2D
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-4 py-3">
              Texto principal
              <span className="rounded-full bg-[var(--color-text-main)] px-3 py-1 text-xs font-semibold text-white">
                #101010
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-4 py-3">
              Preço/destaque
              <span className="rounded-full bg-[var(--color-warning)] px-3 py-1 text-xs font-semibold text-white">
                #F59E0B
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Cupom e CTA
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Ative o cupom e defina um texto padrão para as chamadas de ação.
          </p>
          <div className="mt-6 space-y-3 text-sm text-[var(--color-text-secondary)]">
            <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
              Cupom ativo:{" "}
              <span className="font-semibold text-[var(--color-text-main)]">
                DESCONTO10
              </span>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
              CTA padrão:{" "}
              <span className="font-semibold text-[var(--color-text-main)]">
                Link na descrição
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Canva e upload
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Edite no Canva ou envie sua própria arte para usar como base.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              type="button"
            >
              Editar no Canva
            </button>
            <button
              className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              type="button"
            >
              Upload de arte
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
