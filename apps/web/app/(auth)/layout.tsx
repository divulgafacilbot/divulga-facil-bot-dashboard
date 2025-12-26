import Image from "next/image";
import Link from "next/link";
import { BOT_NAME } from "@/lib/constants";

const authHighlights = [
  "Acesso rápido ao painel",
  "Templates prontos para personalizar",
  "Fluxo simples para começar",
  "Publicação guiada",
];

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text-main)]">
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-[color:rgba(245,61,45,0.2)] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-160px] left-[-10%] h-96 w-96 rounded-full bg-[color:rgba(45,106,239,0.16)] blur-[140px]" />

      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-8 py-12">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-gradient-secondary text-sm font-semibold text-[var(--color-text-inverse)]">
              <Image
                src="/logo-v2.png"
                alt="Posting Bot"
                width={100}
                height={100}
                className="h-6 w-6 object-contain"
              />
            </span>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">
                {BOT_NAME}
              </p>
              <p className="text-lg font-semibold">Acesso seguro</p>
            </div>
          </Link>
          <Link
            className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:shadow-[var(--shadow-sm)]"
            href="/register"
          >
            Criar conta
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col gap-6">
            <p className="w-fit rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
              Acesso ao painel
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Cadastre-se e comece a configurar seus templates.
            </h1>
            <p className="max-w-xl text-lg text-[var(--color-text-secondary)]">
              Em poucos passos, você acessa o painel, ajusta suas artes e
              prepara conteúdos para divulgar.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {authHighlights.map((item) => (
                <div
                  key={item}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text-secondary)] shadow-[var(--shadow-sm)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-10 shadow-[var(--shadow-md)]">
            {children}
          </section>
        </main>

        <footer className="flex flex-col justify-between gap-2 border-t border-[var(--color-border)] py-8 text-xs text-[var(--color-text-secondary)] sm:flex-row">
          <span>{BOT_NAME} • acesso seguro</span>
          <span>Precisa de ajuda? suporte@postingbot.com</span>
        </footer>
      </div>
    </div>
  );
}
