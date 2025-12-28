"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { mockProduct } from "@/lib/mock-data";

const TEMPLATE_COLORS = [
  "gray",
  "black",
  "blue",
  "green",
  "orange",
  "pink",
  "red",
  "yellow",
] as const;

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState({
    title: true,
    description: true,
    promotionalPrice: true,
    fullPrice: true,
    affiliateLink: true,
    coupon: true,
  });

  const templatePreviewSrc =
    selectedTemplate === null
      ? "/templates/black-template-feed.png"
      : `/templates/${selectedTemplate}-template-feed.png`;

  const productImageSrc = useMemo(
    () => mockProduct.imagem.replace(/^public\//, "/"),
    []
  );

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

      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Definir background
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Escolha o layout que define posição de imagem, preço, título e
            cupom.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {TEMPLATE_COLORS.map((color) => (
              <div
                key={color}
                className="relative mx-auto w-full max-w-[100px]"
                style={{ paddingBottom: "100%" }}
              >
                <button
                  onClick={() => setSelectedTemplate(color)}
                  style={{
                    borderWidth: selectedTemplate === color ? "4px" : "2px",
                    borderColor:
                      selectedTemplate === color
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                    borderStyle: "solid",
                  }}
                  className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] max-w-[100px]"
                  type="button"
                  aria-label={`Selecionar template ${color}`}
                >
                  <Image
                    src={`/templates/${color}-template-feed.png`}
                    alt={`Template ${color}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 100px) 50vw, (max-width: 100px) 33vw, 25vw"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Detalhes do card
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Selecione o que deve aparecer no card gerado.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                Template do card
              </p>
              <div className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                  <span className="font-semibold text-[var(--color-text-main)]">
                    Imagem (obrigatória)
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Sem checkbox
                  </span>
                </div>
                <label className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                  <span>Título</span>
                  <input
                    type="checkbox"
                    checked={cardDetails.title}
                    onChange={(event) =>
                      setCardDetails((prev) => ({
                        ...prev,
                        title: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                  <span>Descrição</span>
                  <input
                    type="checkbox"
                    checked={cardDetails.description}
                    onChange={(event) =>
                      setCardDetails((prev) => ({
                        ...prev,
                        description: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                  <span>Preço promocional</span>
                  <input
                    type="checkbox"
                    checked={cardDetails.promotionalPrice}
                    onChange={(event) =>
                      setCardDetails((prev) => ({
                        ...prev,
                        promotionalPrice: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                  <span>Preço cheio</span>
                  <input
                    type="checkbox"
                    checked={cardDetails.fullPrice}
                    onChange={(event) =>
                      setCardDetails((prev) => ({
                        ...prev,
                        fullPrice: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                  <span>Link de afiliado</span>
                  <input
                    type="checkbox"
                    checked={cardDetails.affiliateLink}
                    onChange={(event) =>
                      setCardDetails((prev) => ({
                        ...prev,
                        affiliateLink: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                  <span>Cupom de desconto</span>
                  <input
                    type="checkbox"
                    checked={cardDetails.coupon}
                    onChange={(event) =>
                      setCardDetails((prev) => ({
                        ...prev,
                        coupon: event.target.checked,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                Preview em tempo real
              </p>
              <div className="mt-4 space-y-4">
                <div className="relative h-[200px] w-[200px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
                  <div className="relative h-full w-full">
                    <Image
                      src={templatePreviewSrc}
                      alt="Template selecionado"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 70vw, 320px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-[80%] w-[80%]">
                        <Image
                          src={productImageSrc}
                          alt={mockProduct.title}
                          fill
                          className="object-contain"
                          sizes="(max-width: 1024px) 56vw, 256px"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                  {cardDetails.title && (
                    <p className="font-semibold text-[var(--color-text-main)]">
                      {mockProduct.title}
                    </p>
                  )}
                  {cardDetails.description && <p>{mockProduct.description}</p>}
                  {cardDetails.promotionalPrice && (
                    <p>
                      <span className="font-semibold text-[var(--color-text-main)]">
                        Promoção:
                      </span>{" "}
                      {mockProduct.promotionalPrice}
                    </p>
                  )}
                  {cardDetails.fullPrice && (
                    <p>
                      <span className="font-semibold text-[var(--color-text-main)]">
                        Preço cheio:
                      </span>{" "}
                      {mockProduct.fullPrice}
                    </p>
                  )}
                  {cardDetails.affiliateLink && (
                    <p className="break-all">{mockProduct.affiliateLink}</p>
                  )}
                  {cardDetails.coupon && (
                    <p>
                      <span className="font-semibold text-[var(--color-text-main)]">
                        Cupom:
                      </span>{" "}
                      {mockProduct.coupon}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
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
