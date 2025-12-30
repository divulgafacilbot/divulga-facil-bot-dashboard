import AppHeader from "@/components/common/AppHeader";

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

      <AppHeader variant="auth" />

      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-8 py-[50px]">

        <main className="grid flex-1 items-start gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col gap-3 pt-[50px]">
            <p className="w-fit rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
              Acesso ao painel
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Cadastre-se e aumente sua produtividade como afiliado.
            </h1>
            <p className="max-w-xl text-lg text-[var(--color-text-secondary)]">
              Em poucos passos, você acessa o painel, ajusta seus templates e
              começa a trabalhar com muito mais eficiência, podendo manter o seu foco no que realmente importa.
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

      </div>
    </div>
  );
}
