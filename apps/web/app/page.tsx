import Image from "next/image";
import Link from "next/link";
import { BOT_NAME } from "@/lib/constants";

const highlights = [
  {
    title: "Acesso imediato",
    description: "Crie sua conta e entre em minutos para começar.",
  },
  {
    title: "Templates prontos",
    description: "Personalize artes de afiliados com poucos cliques.",
  },
  {
    title: "Publicação prática",
    description: "Divulgue nos seus canais e aumente suas conversões.",
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

      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-8 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-gradient-secondary text-sm font-semibold text-[var(--color-text-inverse)]">
            <Image
              src="/logo-v2.png"
              alt="Posting Bot"
              width={50}
              height={50}
              className="h-6 w-6 object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">
              {BOT_NAME}
            </p>
            <p className="text-lg font-semibold">Painel seguro</p>
          </div>
        </div>
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link
            className="rounded-[var(--radius-sm)] px-4 py-2 text-[var(--color-text-main)] transition hover:bg-white"
            href="/login"
          >
            Entrar
          </Link>
          <Link
            className="rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-primary-hover)]"
            href="/register"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-8 pb-24">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <p className="w-fit rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
              Configure e publique rápido
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Personalize seus templates e publique suas artes.
            </h1>
            <p className="max-w-xl text-lg text-[var(--color-text-secondary)]">
              Entre com sua conta, ajuste seus modelos de afiliados e gere
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
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
              <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-2">
                Templates personalizáveis
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-2">
                Fluxo guiado
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-white px-3 py-2">
                Publicação rápida
              </span>
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
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-sm)]"
            >
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {card.description}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-10 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                Comece pelo onboarding seguro.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-[var(--color-text-secondary)]">
                Sua conta fica pronta agora. Em seguida seguimos para o
                dashboard completo com automações e monitoramento.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-[var(--radius-sm)] bg-[var(--color-secondary)] px-5 py-3 text-sm font-semibold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] transition hover:opacity-90"
                href="/login"
              >
                Acessar painel
              </Link>
              <Link
                className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-text-main)] transition hover:shadow-[var(--shadow-sm)]"
                href="/register"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-8 py-8 text-xs text-[var(--color-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <span>{BOT_NAME} • Controle simples e seguro</span>
          <span>Cadastro, personalização e publicação</span>
        </div>
      </footer>
    </div>
  );
}
