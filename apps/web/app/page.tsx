import AppHeader from "@/components/common/AppHeader";
import Link from "next/link";

const highlights = [
  {
    title: "Acesso imediato",
    description: "Crie sua conta e em minutos comece automatizar suas publicações.",
  },
  {
    title: "Templates prontos",
    description: "Automatize a sua criação artes de afiliados com diversos templates prontos.",
  },
  {
    title: "Publicação prática",
    description: "Economize o seu tempo na criação de artes, utilize seu tempo na divulgação nos seus canais e aumente suas conversões.",
  },
];

const steps = [
  "Crie sua conta com e-mail e senha",
  "Faça seu acesso",
  "Personalize os templates das suas artes de afiliados",
  "Divulgue em seus canais e ganhe dinheiro",
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text-main)]">
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-[color:rgba(245,61,45,0.2)] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-160px] left-[-10%] h-96 w-96 rounded-full bg-[color:rgba(45,106,239,0.16)] blur-[140px]" />

      <AppHeader variant="home" />

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-8 pb-24 pt-[90px]">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <p className="w-fit rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
              Configure e publique rápido
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Pare de perder tempo criando artes todos os dias e se concentre no que te traz resultado.
            </h1>
            <p className="max-w-xl text-lg text-[var(--color-text-secondary)]">
              Entre com sua conta, ajuste seus templates e gere
              conteúdos prontos para divulgar nos seus canais.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-primary-hover)]"
                href="/register"
              >
                Criar conta
              </Link>
              <Link
                className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-text-main)] transition hover:shadow-[var(--shadow-sm)]"
                href="/login"
              >
                Entrar
              </Link>
            </div>

          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Fluxo principal</p>
              <span className="rounded-full bg-[color:rgba(34,197,94,0.15)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">
                Guiado
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {steps.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-secondary)] text-sm font-semibold text-[var(--color-text-inverse)]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {highlights.map((card) => (
            <div
              key={card.title}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-sm)]"
            >
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {card.description}
              </p>
            </div>
          ))}
        </section>


      </main>

    </div>
  );
}
