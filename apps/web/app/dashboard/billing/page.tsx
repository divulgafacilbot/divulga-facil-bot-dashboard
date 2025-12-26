export default function BillingPage() {
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
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Status do plano
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Confira se sua assinatura está ativa e quando expira.
          </p>
          <div className="mt-6 space-y-3 text-sm text-[var(--color-text-secondary)]">
            <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
              Status:{" "}
              <span className="font-semibold text-[var(--color-success)]">
                Ativo
              </span>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
              Expira em:{" "}
              <span className="font-semibold text-[var(--color-text-main)]">
                30/12/2025
              </span>
            </div>
            <button
              className="w-full rounded-xl border-2 border-[var(--color-primary)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-primary)] transition-all hover:bg-[color:rgba(245,61,45,0.05)]"
              type="button"
            >
              Assinar / renovar
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Vincular conta Kiwify
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Informe o e-mail usado no pagamento para receber o código de
            validação e liberar o acesso.
          </p>
          <form className="mt-6 space-y-4">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
              E-mail do pagamento
              <input
                type="email"
                placeholder="seuemail@kiwify.com"
                className="mt-2 w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl border-2 border-[var(--color-primary)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-primary)] transition-all hover:bg-[color:rgba(245,61,45,0.05)]"
            >
              Vincular minha conta Kiwify
            </button>
          </form>
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
            Enviaremos um código de 6 dígitos para confirmar a titularidade da
            compra.
          </p>
        </div>
      </div>
    </>
  );
}
