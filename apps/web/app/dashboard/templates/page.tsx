"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { mockProduct } from "@/lib/mock-data";
import { useSidebar } from "../layout";

const TEMPLATES = [
  "amazon",
  "amazon1",
  "black2",
  "blue",
  "degrade",
  "green",
  "greenblack",
  "magalu",
  "magalu2",
  "pink",
  "pinkblack",
  "purple",
  "purple2",
  "promo",
  "red",
  "Shopee2",
  "shopee",
  "vinho",
  "yellow",
  "yellow2",
  "yellowblack",
] as const;

type TemplateOption = {
  id: string;
  name: string;
  feedUrl: string;
  storyUrl: string;
  source: "system" | "custom";
};

const SYSTEM_TEMPLATES: TemplateOption[] = TEMPLATES.map((template) => ({
  id: template,
  name: template,
  feedUrl: `/templates/${template}-feed.png`,
  storyUrl: `/templates/${template}-story.png`,
  source: "system",
}));

const TemplateImage = ({
  src,
  alt,
  className,
  width,
  height,
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}) => {
  if (src.startsWith("http")) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
};

export default function TemplatesPage() {
  const { sidebarCollapsed } = useSidebar();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(SYSTEM_TEMPLATES[0]);
  const [useRowLayout, setUseRowLayout] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    title: true,
    description: true,
    promotionalPrice: true,
    fullPrice: true,
    affiliateLink: true,
    coupon: true,
    disclaimer: false,
    customText: false,
  });

  useEffect(() => {
    const checkLayout = () => {
      const breakpoint = sidebarCollapsed ? 1600 : 1810;
      setUseRowLayout(window.innerWidth >= breakpoint);
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, [sidebarCollapsed]);
  const [storyDetails, setStoryDetails] = useState({
    title: true,
    promotionalPrice: true,
    fullPrice: true,
    coupon: true,
    customText: false,
  });
  const [feedColors, setFeedColors] = useState({
    title: "#000000",
    description: "#000000",
    promotionalPrice: "#000000",
    fullPrice: "#000000",
    affiliateLink: "#000000",
    coupon: "#000000",
    disclaimer: "#000000",
    customText: "#000000",
  });
  const [storyColors, setStoryColors] = useState({
    title: "#000000",
    promotionalPrice: "#000000",
    fullPrice: "#000000",
    coupon: "#000000",
    customText: "#000000",
  });
  const [customCardText, setCustomCardText] = useState("");
  const [customStoryText, setCustomStoryText] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [feedTemplate, setFeedTemplate] = useState<File | null>(null);
  const [storyTemplate, setStoryTemplate] = useState<File | null>(null);
  const [feedError, setFeedError] = useState<string>("");
  const [storyError, setStoryError] = useState<string>("");
  const [templateName, setTemplateName] = useState("");
  const [templateNameTouched, setTemplateNameTouched] = useState(false);
  const [isCanvaModalOpen, setIsCanvaModalOpen] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<TemplateOption[]>([]);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [selectedCustomIds, setSelectedCustomIds] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFeedFile, setEditFeedFile] = useState<File | null>(null);
  const [editStoryFile, setEditStoryFile] = useState<File | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameTouched, setEditNameTouched] = useState(false);
  const [editFeedError, setEditFeedError] = useState("");
  const [editStoryError, setEditStoryError] = useState("");
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isDeletingTemplates, setIsDeletingTemplates] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  useEffect(() => {
    const loadCustomTemplates = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/templates`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (Array.isArray(data.templates)) {
          setCustomTemplates(data.templates);
          if (data.templates.length > 0) {
            setSelectedTemplate(data.templates[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar templates personalizados:", error);
      }
    };

    loadCustomTemplates();
  }, [apiBaseUrl]);

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

  const templatePreviewSrc = selectedTemplate.feedUrl;

  const templateStoryPreviewSrc = selectedTemplate.storyUrl;

  const allTemplates = useMemo(
    () => [...customTemplates, ...SYSTEM_TEMPLATES],
    [customTemplates]
  );

  const selectedCustomTemplate = useMemo(() => {
    if (selectedCustomIds.length !== 1) return null;
    return customTemplates.find((template) => template.id === selectedCustomIds[0]) || null;
  }, [customTemplates, selectedCustomIds]);

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
          // Feed deve ser 4:5 (aspect ratio entre 0.75 e 0.85)
          if (aspectRatio < 0.75 || aspectRatio > 0.85) {
            resolve("O formato desta imagem não está bom para feed (4:5)");
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

  const handleSaveTemplates = async () => {
    if (
      feedError ||
      storyError ||
      !feedTemplate ||
      !storyTemplate ||
      !templateName.trim()
    ) {
      return;
    }

    setIsSavingTemplate(true);
    setSaveError("");

    try {
      const formData = new FormData();
      formData.append("name", templateName.trim());
      formData.append("feed", feedTemplate);
      formData.append("story", storyTemplate);

      const response = await fetch(`${apiBaseUrl}/api/templates`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveError(data?.error || "Nao foi possivel salvar o template.");
        return;
      }

      if (data.template) {
        setCustomTemplates((prev) => [data.template, ...prev]);
        setSelectedTemplate(data.template);
      }

      setFeedTemplate(null);
      setStoryTemplate(null);
      setFeedError("");
      setStoryError("");
      setTemplateName("");
      setTemplateNameTouched(false);
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      setSaveError("Erro ao enviar os arquivos. Tente novamente.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleToggleCustomTemplate = (templateId: string) => {
    setSelectedCustomIds((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      }
      return [...prev, templateId];
    });
  };

  const handleOpenEditModal = () => {
    if (!selectedCustomTemplate) return;
    setEditName(selectedCustomTemplate.name);
    setEditFeedFile(null);
    setEditStoryFile(null);
    setEditFeedError("");
    setEditStoryError("");
    setEditNameTouched(false);
    setIsEditModalOpen(true);
  };

  const handleEditFeedChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setEditFeedFile(file);
      const error = await validateImageFormat(file, "feed");
      setEditFeedError(error);
    }
  };

  const handleEditStoryChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setEditStoryFile(file);
      const error = await validateImageFormat(file, "story");
      setEditStoryError(error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedCustomTemplate) return;

    if (editFeedError || editStoryError || !editName.trim()) {
      setEditNameTouched(true);
      return;
    }

    setIsEditingTemplate(true);
    setSaveError("");

    try {
      const formData = new FormData();
      formData.append("name", editName.trim());
      if (editFeedFile) {
        formData.append("feed", editFeedFile);
      }
      if (editStoryFile) {
        formData.append("story", editStoryFile);
      }

      const response = await fetch(`${apiBaseUrl}/api/templates/${selectedCustomTemplate.id}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveError(data?.error || "Nao foi possivel atualizar o template.");
        return;
      }

      if (data.template) {
        setCustomTemplates((prev) =>
          prev.map((template) =>
            template.id === data.template.id ? data.template : template
          )
        );
        setSelectedTemplate(data.template);
      }

      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar template:", error);
      setSaveError("Erro ao atualizar o template.");
    } finally {
      setIsEditingTemplate(false);
    }
  };

  const handleDeleteTemplates = async () => {
    if (selectedCustomIds.length === 0) return;

    const confirmed = window.confirm(
      selectedCustomIds.length === 1
        ? "Tem certeza que deseja deletar este template?"
        : "Tem certeza que deseja deletar estes templates?"
    );

    if (!confirmed) return;

    setIsDeletingTemplates(true);
    setSaveError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/templates`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedCustomIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveError(data?.error || "Nao foi possivel deletar os templates.");
        return;
      }

      setCustomTemplates((prev) =>
        prev.filter((template) => !selectedCustomIds.includes(template.id))
      );
      setSelectedCustomIds([]);
    } catch (error) {
      console.error("Erro ao deletar templates:", error);
      setSaveError("Erro ao deletar templates.");
    } finally {
      setIsDeletingTemplates(false);
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
                Imagem de fundo
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Escolha o layout que define posição de imagem, preço, título e
                cupom.
              </p>
            </div>
            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              type="button"
            >
              Templates Personalizados
            </button>
          </div>
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
              {allTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  style={{
                    borderWidth: selectedTemplate.id === template.id ? "4px" : "2px",
                    borderColor:
                      selectedTemplate.id === template.id
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                    borderStyle: "solid",
                  }}
                  className="relative h-[270px] w-auto flex-shrink-0 overflow-hidden shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)]"
                  type="button"
                  aria-label={`Selecionar template ${template.name}`}
                >
                  <TemplateImage
                    src={template.storyUrl}
                    alt={`Template ${template.name}`}
                    width={152}
                    height={270}
                    className="h-full w-auto object-contain"
                  />
                  {selectedTemplate.id === template.id && (
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

        <div className={`rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] ${!useRowLayout ? 'max-w-[700px]' : ''}`}>
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
            Definição de Layout
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Personalize as informações que aparecerão nas artes geradas para cada plataforma.
          </p>
          <div className={`mt-6 flex gap-6 ${useRowLayout ? 'flex-row' : 'flex-col'}`}>
            {/* Card para Feed/Telegram/WhatsApp */}
            <div className="max-w-[700px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="flex flex-col gap-6 sm:flex-row">
                {/* Informações do card */}
                <div className="w-full sm:w-[400px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                    Informações do card
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
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
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                        <span>Aviso de promoção</span>
                        <input
                          type="checkbox"
                          checked={cardDetails.disclaimer}
                          onChange={(event) =>
                            setCardDetails((prev) => ({
                              ...prev,
                              disclaimer: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={feedColors.disclaimer}
                            onChange={(e) =>
                              setFeedColors((prev) => ({
                                ...prev,
                                disclaimer: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: feedColors.disclaimer }}
                          />
                        </div>
                        <input
                          type="text"
                          value={feedColors.disclaimer}
                          onChange={(e) =>
                            setFeedColors((prev) => ({
                              ...prev,
                              disclaimer: e.target.value,
                            }))
                          }
                          className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                        <input
                          type="text"
                          value={customCardText}
                          onChange={(event) => setCustomCardText(event.target.value)}
                          placeholder="Meu texto personalizado"
                          className="w-full bg-transparent text-sm text-[var(--color-text-secondary)] outline-none"
                        />
                        <input
                          type="checkbox"
                          checked={cardDetails.customText}
                          onChange={(event) =>
                            setCardDetails((prev) => ({
                              ...prev,
                              customText: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={feedColors.customText}
                            onChange={(e) =>
                              setFeedColors((prev) => ({
                                ...prev,
                                customText: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: feedColors.customText }}
                          />
                        </div>
                        <input
                          type="text"
                          value={feedColors.customText}
                          onChange={(e) =>
                            setFeedColors((prev) => ({
                              ...prev,
                              customText: e.target.value,
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
                    <div className="relative h-[250px] w-[200px] overflow-hidden border border-[var(--color-border)] bg-white">
                      <div className="relative h-full w-full">
                        {selectedTemplate.source === "custom" ? (
                          <img
                            src={templatePreviewSrc}
                            alt="Template selecionado"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Image
                            src={templatePreviewSrc}
                            alt="Template selecionado"
                            fill
                            className="object-contain"
                            sizes="(max-width: 1024px) 70vw, 320px"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '30px' }}>
                          <div className="relative h-[140px] w-[140px]">
                            <Image
                              src={productImageSrc}
                              alt={mockProduct.title}
                              fill
                              className="object-contain"
                              sizes="135px"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                      {cardDetails.title && (
                        <p className="font-semibold" style={{ color: feedColors.title }}>
                          🛍️ {mockProduct.title}
                        </p>
                      )}
                      {cardDetails.description && (
                        <p style={{ color: feedColors.description }}>
                          {mockProduct.description}
                        </p>
                      )}
                      {cardDetails.promotionalPrice && (
                        <p style={{ color: feedColors.promotionalPrice }}>
                          💸 por R$ {mockProduct.promotionalPrice.replace('R$ ', '')} 🚨🚨
                        </p>
                      )}
                      {cardDetails.fullPrice && (
                        <p style={{ color: feedColors.fullPrice }}>
                          <span className="font-semibold">
                            Preço cheio:
                          </span>{" "}
                          {mockProduct.fullPrice}
                        </p>
                      )}
                      {cardDetails.affiliateLink && (
                        <div style={{ color: feedColors.affiliateLink }}>
                          <p style={{ marginBottom: 0 }}>👉Link p/ comprar:</p>
                          <p className="break-all">{mockProduct.affiliateLink}</p>
                        </div>
                      )}
                      {cardDetails.coupon && (
                        <p style={{ color: feedColors.coupon }}>
                          <span className="font-semibold">
                            Cupom:
                          </span>{" "}
                          {mockProduct.coupon}
                        </p>
                      )}
                      {cardDetails.disclaimer && (
                        <p className="text-xs italic" style={{ color: feedColors.disclaimer }}>
                          *Promoção sujeita a alteração a qualquer momento
                        </p>
                      )}
                      {cardDetails.customText && customCardText.trim() && (
                        <p style={{ color: feedColors.customText }}>
                          {customCardText}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card para Stories */}
            <div className="max-w-[700px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="flex flex-col gap-6 sm:flex-row">
                {/* Informações do story */}
                <div className="w-full sm:w-[400px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                    Informações do story
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
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
                    <div className="flex w-full items-center gap-2">
                      <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                        <input
                          type="text"
                          value={customStoryText}
                          onChange={(event) => setCustomStoryText(event.target.value)}
                          placeholder="Meu texto personalizado"
                          className="w-full bg-transparent text-sm text-[var(--color-text-secondary)] outline-none"
                        />
                        <input
                          type="checkbox"
                          checked={storyDetails.customText}
                          onChange={(event) =>
                            setStoryDetails((prev) => ({
                              ...prev,
                              customText: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <div className="flex w-[110px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-[4px] py-[4px]">
                        <div className="relative">
                          <input
                            type="color"
                            value={storyColors.customText}
                            onChange={(e) =>
                              setStoryColors((prev) => ({
                                ...prev,
                                customText: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
                            style={{ backgroundColor: storyColors.customText }}
                          />
                        </div>
                        <input
                          type="text"
                          value={storyColors.customText}
                          onChange={(e) =>
                            setStoryColors((prev) => ({
                              ...prev,
                              customText: e.target.value,
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
                      {selectedTemplate.source === "custom" ? (
                        <img
                          src={templateStoryPreviewSrc}
                          alt="Template story selecionado"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Image
                          src={templateStoryPreviewSrc}
                          alt="Template story selecionado"
                          fill
                          className="object-contain"
                          sizes="225px"
                        />
                      )}
                      <div className="absolute inset-0 flex flex-col">
                        {/* 1/6 superior vazio */}
                        <div style={{ height: 'calc(100% / 6)' }} />

                        {/* 4/6 central com conteúdo principal */}
                        <div className="flex flex-col items-center justify-center text-center" style={{ height: 'calc(100% * 4 / 6)', paddingLeft: '15%', paddingRight: '15%' }}>
                          <div className="relative mb-2 h-[100px] w-[100px] flex-shrink-0">
                            <Image
                              src={productImageSrc}
                              alt={mockProduct.title}
                              fill
                              className="object-contain"
                              sizes="100px"
                            />
                          </div>
                          <div className="space-y-1 flex-shrink min-h-0">
                            {storyDetails.title && (
                              <p className="text-sm font-bold leading-tight" style={{ color: storyColors.title }}>
                                {mockProduct.title}
                              </p>
                            )}
                            {storyDetails.promotionalPrice && (
                              <p className="text-base font-bold" style={{ color: storyColors.promotionalPrice }}>
                                {mockProduct.promotionalPrice}
                              </p>
                            )}
                            {storyDetails.fullPrice && (
                              <p className="text-xs line-through opacity-80" style={{ color: storyColors.fullPrice }}>
                                {mockProduct.fullPrice}
                              </p>
                            )}
                            {storyDetails.coupon && (
                              <p className="rounded-lg bg-black/10 px-2 py-0.5 text-xs font-semibold" style={{ color: storyColors.coupon }}>
                                {mockProduct.coupon}
                              </p>
                            )}
                            {storyDetails.customText && customStoryText.trim() && (
                              <p className="text-xs font-semibold" style={{ color: storyColors.customText }}>
                                {customStoryText}
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
            <a
              className="flex items-center justify-center rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:no-underline"
              href="/template-base.zip"
              download="template-base-divulga-facil.zip"
            >
              Download de template básico
            </a>
            <button
              className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              type="button"
              onClick={() => setIsCanvaModalOpen(true)}
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

      {/* Modal de Editar no Canva */}
      {isCanvaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsCanvaModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setIsCanvaModalOpen(false)}
              className="absolute right-4 top-4 text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              type="button"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold text-[var(--color-text-main)]">
              Editar no Canva
            </h2>
            <h5 className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <strong>1) </strong>Seu layout novo necessita obrigatoriamente de 2 formatos, ambos padronizados no Canva: formato feed e formato story.
            </h5>
            <h5 className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <strong>2) </strong>Ah5ós clicar no botão e o temh5late padrão se abrir, clique em <strong>Arquivo</strong> &gt; <strong>Fazer uma cópia</strong>, conforme o vídeo abaixo.
            </h5>
            <h5 className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <strong>3) </strong>Depois de prontas as duas artes, anexe pelo botão <strong>Upload de arte</strong>.
            </h5>

            <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
              <video
                src="/Canva.mp4"
                controls
                className="h-auto w-full"
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <a
                className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-5 py-2 text-center text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90"
                href="https://www.canva.com/design/DAG88NhTX6o/YeHyZO5pxBvB79VzA86L8Q/edit?utm_content=DAG88NhTX6o&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton"
                target="_blank"
                rel="noreferrer"
              >
                Editar template de feed
              </a>
              <a
                className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-5 py-2 text-center text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90"
                href="https://www.canva.com/design/DAG88Nru2NU/9YuU22yvNeP9frr06sUgtw/edit?utm_content=DAG88Nru2NU&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton"
                target="_blank"
                rel="noreferrer"
              >
                Editar template de story
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upload de Arte */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
          >
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
                    <span className="text-[var(--color-primary)]">•</span>
                    <span>São necessárias as duas artes para a produção de seu template personalizado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)]">•</span>
                    <span>
                      <strong>Template Feed:</strong> Formato vertical (1080x1350px - proporção 4:5)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)]">•</span>
                    <span>
                      <strong>Template Story:</strong> Formato vertical (1080x1920px - proporção 9:16)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)]">•</span>
                    <span>Formatos aceitos: JPG, PNG</span>
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

              {/* Nome do template */}
              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Nome do template
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: Promoção Primavera"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    onBlur={() => setTemplateNameTouched(true)}
                    className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
                  />
                </label>
                {templateNameTouched && !templateName.trim() && (
                  <p className="mt-2 text-sm font-semibold text-red-600">
                    Informe um nome para o template.
                  </p>
                )}
              </div>

              {saveError && (
                <p className="text-sm font-semibold text-red-600">
                  {saveError}
                </p>
              )}

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
                  disabled={
                    !!feedError ||
                    !!storyError ||
                    !feedTemplate ||
                    !storyTemplate ||
                    !templateName.trim() ||
                    isSavingTemplate
                  }
                  className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                >
                  {isSavingTemplate ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Templates Personalizados */}
      {isCustomModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsCustomModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setIsCustomModalOpen(false)}
              className="absolute right-4 top-4 text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              type="button"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold text-[var(--color-text-main)]">
              Templates Personalizados
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Selecione os templates personalizados para editar ou deletar.
            </p>

            <div className="mt-6 max-h-[300px] space-y-2 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              {customTemplates.length === 0 && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Nenhum template personalizado encontrado.
                </p>
              )}
              {customTemplates.map((template) => (
                <label
                  key={template.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-main)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomIds.includes(template.id)}
                    onChange={() => handleToggleCustomTemplate(template.id)}
                  />
                  <TemplateImage
                    src={template.feedUrl}
                    alt={`Template ${template.name}`}
                    width={20}
                    height={25}
                    className="h-[25px] w-[20px] rounded object-cover"
                  />
                  <span className="font-semibold">{template.name}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleOpenEditModal}
                disabled={selectedCustomIds.length !== 1}
                className="rounded-xl border-2 border-[var(--color-border)] bg-white px-5 py-2 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
              >
                Editar
              </button>
              <button
                onClick={handleDeleteTemplates}
                disabled={selectedCustomIds.length === 0 || isDeletingTemplates}
                className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
              >
                {isDeletingTemplates ? "Deletando..." : "Deletar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Template */}
      {isEditModalOpen && selectedCustomTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              type="button"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold text-[var(--color-text-main)]">
              Editar Template Personalizado
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Altere apenas o que desejar. Campos não modificados serão mantidos.
            </p>

            <div className="mt-6 space-y-6">
              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Alterar o nome do template
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: Promoção Primavera"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    onBlur={() => setEditNameTouched(true)}
                    className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition-all focus:border-[var(--color-primary)]"
                  />
                </label>
                {editNameTouched && !editName.trim() && (
                  <p className="mt-2 text-sm font-semibold text-red-600">
                    Informe um nome para o template.
                  </p>
                )}
              </div>

              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Alterar imagem de fundo para feed.
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleEditFeedChange}
                    className="w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-primary)] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  {editFeedFile && (
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      Arquivo selecionado: {editFeedFile.name}
                    </p>
                  )}
                  {editFeedError && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      {editFeedError}
                    </p>
                  )}
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text-main)]">
                    Alterar imagem de fundo para stories
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleEditStoryChange}
                    className="w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-primary)] file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  {editStoryFile && (
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      Arquivo selecionado: {editStoryFile.name}
                    </p>
                  )}
                  {editStoryError && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      {editStoryError}
                    </p>
                  )}
                </label>
              </div>

              {saveError && (
                <p className="text-sm font-semibold text-red-600">
                  {saveError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border-2 border-[var(--color-border)] bg-white px-6 py-2 text-sm font-semibold text-[var(--color-text-main)] transition-all hover:bg-[var(--color-background)]"
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateTemplate}
                  disabled={!!editFeedError || !!editStoryError || !editName.trim() || isEditingTemplate}
                  className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                >
                  {isEditingTemplate ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
