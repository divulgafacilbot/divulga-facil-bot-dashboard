"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { mockProduct } from "@/lib/mock-data";

const TEMPLATES = [
  "black",
  "blue",
  "degrade",
  "gray",
  "green",
  "love",
  "orange",
  "pink",
  "promo",
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
  const [storyDetails, setStoryDetails] = useState({
    title: true,
    promotionalPrice: true,
    fullPrice: true,
    affiliateLink: true,
    coupon: true,
  });
  const [feedColors, setFeedColors] = useState({
    title: "#000000",
    description: "#000000",
    promotionalPrice: "#000000",
    fullPrice: "#000000",
    affiliateLink: "#000000",
    coupon: "#000000",
  });
  const [storyColors, setStoryColors] = useState({
    title: "#000000",
    promotionalPrice: "#000000",
    fullPrice: "#000000",
    affiliateLink: "#000000",
    coupon: "#000000",
  });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [feedTemplate, setFeedTemplate] = useState<File | null>(null);
  const [storyTemplate, setStoryTemplate] = useState<File | null>(null);
  const [feedError, setFeedError] = useState<string>("");
  const [storyError, setStoryError] = useState<string>("");
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      const newScrollPosition =
        direction === "left"
          ? carouselRef.current.scrollLeft - scrollAmount
          : carouselRef.current.scrollLeft + scrollAmount;
      carouselRef.current.scrollTo({
        left: newScrollPosition,
        behavior: "smooth",
      });
    }
  };

  const templatePreviewSrc =
    selectedTemplate === null
      ? "/templates/black-template-feed.png"
      : `/templates/${selectedTemplate}-template-feed.png`;

  const templateStoryPreviewSrc =
    selectedTemplate === null
      ? "/templates/black-template-story.png"
      : `/templates/${selectedTemplate}-template-story.png`;

  const productImageSrc = useMemo(
    () => mockProduct.imagem.replace(/^public\//, "/"),
    []
  );

  const validateImageFormat = (
    file: File,
    type: "feed" | "story"
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const { width, height } = img;
        const aspectRatio = width / height;

        if (type === "feed") {
          // Feed deve ser aproximadamente quadrado (aspect ratio entre 0.8 e 1.2)
          if (aspectRatio < 0.8 || aspectRatio > 1.2) {
            resolve("O formato desta imagem não está bom para feed");
          } else {
            resolve("");
          }
        } else {
          // Story deve ser aproximadamente 9:16 (aspect ratio entre 0.5 e 0.6)
          if (aspectRatio < 0.5 || aspectRatio > 0.6) {
            resolve("O formato desta imagem não está bom para story");
          } else {
            resolve("");
          }
        }

        URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve("Erro ao carregar a imagem");
      };

      img.src = url;
    });
  };

  const handleFeedTemplateChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setFeedTemplate(file);
      const error = await validateImageFormat(file, "feed");
      setFeedError(error);
    }
  };

  const handleStoryTemplateChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setStoryTemplate(file);
      const error = await validateImageFormat(file, "story");
      setStoryError(error);
    }
  };

  const handleSaveTemplates = () => {
    if (!feedError && !storyError) {
      // TODO: Implementar backend para salvar templates
      setIsUploadModalOpen(false);
    }
  };

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
            Imagem de fundo
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Escolha o layout que define posição de imagem, preço, título e
            cupom.
          </p>
          <div className="relative mt-6">
            {/* Botão Esquerdo */}
            <button
              onClick={() => scrollCarousel("left")}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg hover:bg-gray-100 transition-all border border-[var(--color-border)]"
              type="button"
              aria-label="Anterior"
            >
              <svg
                className="h-6 w-6 text-[var(--color-text-main)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Carousel */}
            <div
              ref={carouselRef}
              className="flex gap-[10px] overflow-x-auto scrollbar-hide px-12"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {TEMPLATES.map((template) => (
                <button
                  key={template}
                  onClick={() => setSelectedTemplate(template)}
                  style={{
                    borderWidth: selectedTemplate === template ? "4px" : "2px",
                    borderColor:
                      selectedTemplate === template
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                    borderStyle: "solid",
                  }}
                  className="relative h-[270px] w-auto flex-shrink-0 overflow-hidden shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)]"
                  type="button"
                  aria-label={`Selecionar template ${template}`}
                >
                  <Image
                    src={`/templates/${template}-template-story.png`}
                    alt={`Template ${template}`}
                    width={152}
                    height={270}
                    className="h-full w-auto object-contain"
                  />
                  {selectedTemplate === template && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                        <svg
                          className="h-6 w-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={4}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Botão Direito */}
            <button
              onClick={() => scrollCarousel("right")}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg hover:bg-gray-100 transition-all border border-[var(--color-border)]"
              type="button"
              aria-label="Próximo"
            >
              <svg
                className="h-6 w-6 text-[var(--color-text-main)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Definição de Layout
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Personalize as informações que aparecerão nas artes geradas para cada plataforma.
          </p>
          <div className="mt-6 flex flex-col gap-6 min-[1490px]:flex-row">
            {/* Card para Feed/Telegram/WhatsApp */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="flex flex-col gap-6 sm:flex-row">
                {/* Informações do card */}
                <div className="w-full sm:w-[400px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                    Informações do card
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                      <span className="font-semibold text-[var(--color-text-main)]">
                        Imagem (obrigatória)
                      </span>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
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
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={feedColors.title}
                            onChange={(e) =>
                              setFeedColors((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: feedColors.title }}
                          />
                        </div>
                        <input
                          type="text"
                          value={feedColors.title}
                          onChange={(e) =>
                            setFeedColors((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
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
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={feedColors.description}
                            onChange={(e) =>
                              setFeedColors((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: feedColors.description }}
                          />
                        </div>
                        <input
                          type="text"
                          value={feedColors.description}
                          onChange={(e) =>
                            setFeedColors((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
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
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={feedColors.promotionalPrice}
                            onChange={(e) =>
                              setFeedColors((prev) => ({
                                ...prev,
                                promotionalPrice: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: feedColors.promotionalPrice }}
                          />
                        </div>
                        <input
                          type="text"
                          value={feedColors.promotionalPrice}
                          onChange={(e) =>
                            setFeedColors((prev) => ({
                              ...prev,
                              promotionalPrice: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
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
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={feedColors.fullPrice}
                            onChange={(e) =>
                              setFeedColors((prev) => ({
                                ...prev,
                                fullPrice: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: feedColors.fullPrice }}
                          />
                        </div>
                        <input
                          type="text"
                          value={feedColors.fullPrice}
                          onChange={(e) =>
                            setFeedColors((prev) => ({
                              ...prev,
                              fullPrice: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
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
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={feedColors.affiliateLink}
                            onChange={(e) =>
                              setFeedColors((prev) => ({
                                ...prev,
                                affiliateLink: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: feedColors.affiliateLink }}
                          />
                        </div>
                        <input
                          type="text"
                          value={feedColors.affiliateLink}
                          onChange={(e) =>
                            setFeedColors((prev) => ({
                              ...prev,
                              affiliateLink: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
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
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={feedColors.coupon}
                            onChange={(e) =>
                              setFeedColors((prev) => ({
                                ...prev,
                                coupon: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: feedColors.coupon }}
                          />
                        </div>
                        <input
                          type="text"
                          value={feedColors.coupon}
                          onChange={(e) =>
                            setFeedColors((prev) => ({
                              ...prev,
                              coupon: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview do card */}
                <div className="w-full sm:w-[250px] flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                    Preview
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="relative h-[200px] w-[200px] overflow-hidden border border-[var(--color-border)] bg-white">
                      <div className="relative h-full w-full">
                        <Image
                          src={templatePreviewSrc}
                          alt="Template selecionado"
                          fill
                          className="object-contain"
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
                        <p className="font-semibold" style={{ color: feedColors.title }}>
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

            {/* Card para Stories */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="flex flex-col gap-6 sm:flex-row">
                {/* Informações do story */}
                <div className="w-full sm:w-[400px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                    Informações do story
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                      <span className="font-semibold text-[var(--color-text-main)]">
                        Imagem (obrigatória)
                      </span>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                        <span>Título</span>
                        <input
                          type="checkbox"
                          checked={storyDetails.title}
                          onChange={(event) =>
                            setStoryDetails((prev) => ({
                              ...prev,
                              title: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={storyColors.title}
                            onChange={(e) =>
                              setStoryColors((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: storyColors.title }}
                          />
                        </div>
                        <input
                          type="text"
                          value={storyColors.title}
                          onChange={(e) =>
                            setStoryColors((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                        <span>Preço promocional</span>
                        <input
                          type="checkbox"
                          checked={storyDetails.promotionalPrice}
                          onChange={(event) =>
                            setStoryDetails((prev) => ({
                              ...prev,
                              promotionalPrice: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={storyColors.promotionalPrice}
                            onChange={(e) =>
                              setStoryColors((prev) => ({
                                ...prev,
                                promotionalPrice: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: storyColors.promotionalPrice }}
                          />
                        </div>
                        <input
                          type="text"
                          value={storyColors.promotionalPrice}
                          onChange={(e) =>
                            setStoryColors((prev) => ({
                              ...prev,
                              promotionalPrice: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                        <span>Preço cheio</span>
                        <input
                          type="checkbox"
                          checked={storyDetails.fullPrice}
                          onChange={(event) =>
                            setStoryDetails((prev) => ({
                              ...prev,
                              fullPrice: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={storyColors.fullPrice}
                            onChange={(e) =>
                              setStoryColors((prev) => ({
                                ...prev,
                                fullPrice: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: storyColors.fullPrice }}
                          />
                        </div>
                        <input
                          type="text"
                          value={storyColors.fullPrice}
                          onChange={(e) =>
                            setStoryColors((prev) => ({
                              ...prev,
                              fullPrice: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                        <span>Link de afiliado</span>
                        <input
                          type="checkbox"
                          checked={storyDetails.affiliateLink}
                          onChange={(event) =>
                            setStoryDetails((prev) => ({
                              ...prev,
                              affiliateLink: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={storyColors.affiliateLink}
                            onChange={(e) =>
                              setStoryColors((prev) => ({
                                ...prev,
                                affiliateLink: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: storyColors.affiliateLink }}
                          />
                        </div>
                        <input
                          type="text"
                          value={storyColors.affiliateLink}
                          onChange={(e) =>
                            setStoryColors((prev) => ({
                              ...prev,
                              affiliateLink: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                        <span>Cupom de desconto</span>
                        <input
                          type="checkbox"
                          checked={storyDetails.coupon}
                          onChange={(event) =>
                            setStoryDetails((prev) => ({
                              ...prev,
                              coupon: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={storyColors.coupon}
                            onChange={(e) =>
                              setStoryColors((prev) => ({
                                ...prev,
                                coupon: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: storyColors.coupon }}
                          />
                        </div>
                        <input
                          type="text"
                          value={storyColors.coupon}
                          onChange={(e) =>
                            setStoryColors((prev) => ({
                              ...prev,
                              coupon: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview do story */}
                <div className="w-full sm:w-[250px] flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                    Preview
                  </p>
                  <div className="mt-4">
                    <div className="relative h-[400px] w-[225px] overflow-hidden border border-[var(--color-border)] bg-white">
                      <Image
                        src={templateStoryPreviewSrc}
                        alt="Template story selecionado"
                        fill
                        className="object-contain"
                        sizes="225px"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <div className="relative mb-4 h-[150px] w-[150px]">
                          <Image
                            src={productImageSrc}
                            alt={mockProduct.title}
                            fill
                            className="object-contain"
                            sizes="150px"
                          />
                        </div>
                        <div className="space-y-2 text-black">
                          {storyDetails.title && (
                            <p className="text-lg font-bold leading-tight">
                              {mockProduct.title}
                            </p>
                          )}
                          {storyDetails.promotionalPrice && (
                            <p className="text-xl font-bold">
                              {mockProduct.promotionalPrice}
                            </p>
                          )}
                          {storyDetails.fullPrice && (
                            <p className="text-sm line-through opacity-80">
                              {mockProduct.fullPrice}
                            </p>
                          )}
                          {storyDetails.coupon && (
                            <p className="rounded-lg bg-black/10 px-3 py-1 text-sm font-semibold">
                              {mockProduct.coupon}
                            </p>
                          )}
                          {storyDetails.affiliateLink && (
                            <p className="break-all text-xs">
                              {mockProduct.affiliateLink}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Utilize suas artes personalizadas
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Faça download do template básico, edite no Canva ou envie sua própria arte personalizada.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <button
              className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              type="button"
            >
              Download de template básico
            </button>
            <button
              className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              type="button"
            >
              Editar no Canva
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              type="button"
            >
              Upload de arte
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Upload de Arte */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-lg)]">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute right-4 top-4 text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              type="button"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold text-[var(--color-text-main)]">
              Upload de Artes Personalizadas
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Envie suas artes personalizadas seguindo os requisitos abaixo.
            </p>

            <div className="mt-6 space-y-6">
              {/* Requisitos */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                <h3 className="font-semibold text-[var(--color-text-main)]">
                  Requisitos das Artes
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-[var(--color-primary)]">•</span>
                    <span>
                      <strong>Template Feed:</strong> Formato quadrado (1080x1080px - proporção 1:1)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-[var(--color-primary)]">•</span>
                    <span>
                      <strong>Template Story:</strong> Formato vertical (1080x1920px - proporção 9:16)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-[var(--color-primary)]">•</span>
                    <span>Formatos aceitos: JPG, PNG</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-[var(--color-primary)]">•</span>
                    <span>As artes devem ser sem bordas arredondadas (formato retangular padrão)</span>
                  </li>
                </ul>
              </div>

              {/* Upload Feed */}
              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Anexar template feed
                  </span>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleFeedTemplateChange}
                      className="w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-primary)] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                    />
                  </div>
                  {feedTemplate && (
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      Arquivo selecionado: {feedTemplate.name}
                    </p>
                  )}
                  {feedError && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      {feedError}
                    </p>
                  )}
                </label>
              </div>

              {/* Upload Story */}
              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Anexar template story
                  </span>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleStoryTemplateChange}
                      className="w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-primary)] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                    />
                  </div>
                  {storyTemplate && (
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      Arquivo selecionado: {storyTemplate.name}
                    </p>
                  )}
                  {storyError && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      {storyError}
                    </p>
                  )}
                </label>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="rounded-xl border-2 border-[var(--color-border)] bg-white px-6 py-2 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:bg-[var(--color-background)]"
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTemplates}
                  disabled={!!feedError || !!storyError}
                  className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
