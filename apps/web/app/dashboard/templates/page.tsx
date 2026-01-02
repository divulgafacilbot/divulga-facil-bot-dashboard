"use client";

import Image from "next/image";
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";

import { mockProduct } from "@/lib/mock-data";
import { showToast } from "@/lib/toast";
import { useSidebar } from "../layout";

const TEMPLATES = [
  "meli1",
  "meli2",
  "magalu",
  "magalu2",
  "shopee",
  "Shopee2",
  "amazon",
  "amazon1",
  "black2",
  "blue",
  "degrade",
  "green",
  "greenblack",
  "pink",
  "pinkblack",
  "purple",
  "purple2",
  "promo",
  "red",
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

type RenderFieldId =
  | "title"
  | "description"
  | "price"
  | "originalPrice"
  | "productUrl"
  | "coupon"
  | "disclaimer"
  | "salesQuantity"
  | "customText";

type StoryFieldId = "title" | "price" | "originalPrice" | "coupon" | "customText";

const DEFAULT_FEED_ORDER: RenderFieldId[] = [
  "title",
  "description",
  "price",
  "originalPrice",
  "productUrl",
  "coupon",
  "disclaimer",
  "salesQuantity",
  "customText",
];

const DEFAULT_STORY_ORDER: StoryFieldId[] = [
  "title",
  "price",
  "originalPrice",
  "coupon",
  "customText",
];

const FEED_ORDER_STORAGE_KEY = "feed_render_order";
const STORY_ORDER_STORAGE_KEY = "story_render_order";

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
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized={src.startsWith("http")}
      loader={src.startsWith("http") ? ({ src }) => src : undefined}
    />
  );
};

export default function TemplatesPage() {
  const { sidebarCollapsed } = useSidebar();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(SYSTEM_TEMPLATES[0]);
  const [useRowLayout, setUseRowLayout] = useState(false);
  const [feedOrder, setFeedOrder] = useState<RenderFieldId[]>(DEFAULT_FEED_ORDER);
  const [storyOrder, setStoryOrder] = useState<StoryFieldId[]>(DEFAULT_STORY_ORDER);
  const [isCardReorderMode, setIsCardReorderMode] = useState(false);
  const [isStoryReorderMode, setIsStoryReorderMode] = useState(false);
  const [draggingFeedId, setDraggingFeedId] = useState<RenderFieldId | null>(null);
  const [draggingStoryId, setDraggingStoryId] = useState<StoryFieldId | null>(null);
  const [dragOverFeedId, setDragOverFeedId] = useState<RenderFieldId | null>(null);
  const [dragOverStoryId, setDragOverStoryId] = useState<StoryFieldId | null>(null);
  const feedDragHandleActive = useRef(false);
  const storyDragHandleActive = useRef(false);
  const [cardDetails, setCardDetails] = useState({
    title: true,
    description: true,
    promotionalPrice: true,
    fullPrice: true,
    affiliateLink: true,
    coupon: true,
    disclaimer: false,
    salesQuantity: false,
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
  const [storyColors, setStoryColors] = useState({
    title: "#000000",
    promotionalPrice: "#000000",
    fullPrice: "#000000",
    coupon: "#000000",
    customText: "#000000",
  });
  const [ctaText, setCtaText] = useState("");
  const [couponText, setCouponText] = useState("");
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
  const [isSavingLayout, setIsSavingLayout] = useState(false);
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

  useEffect(() => {
    const normalizeFeedOrder = (order: string[]) =>
      order
        .map((item) => {
          if (item === "promotionalPrice") return "price";
          if (item === "fullPrice") return "originalPrice";
          if (item === "affiliateLink") return "productUrl";
          return item;
        })
        .filter((item): item is RenderFieldId => DEFAULT_FEED_ORDER.includes(item as RenderFieldId));

    const normalizeStoryOrder = (order: string[]) =>
      order
        .map((item) => {
          if (item === "promotionalPrice") return "price";
          if (item === "fullPrice") return "originalPrice";
          return item;
        })
        .filter((item): item is StoryFieldId => DEFAULT_STORY_ORDER.includes(item as StoryFieldId));

    const storedFeedOrder = localStorage.getItem(FEED_ORDER_STORAGE_KEY);
    const storedStoryOrder = localStorage.getItem(STORY_ORDER_STORAGE_KEY);

    if (storedFeedOrder) {
      try {
        const parsed = JSON.parse(storedFeedOrder) as string[];
        const normalized = normalizeFeedOrder(parsed);
        if (normalized.length) {
          setFeedOrder(normalized);
        }
      } catch (error) {
        console.error("Erro ao ler a ordem do feed:", error);
      }
    }

    if (storedStoryOrder) {
      try {
        const parsed = JSON.parse(storedStoryOrder) as string[];
        const normalized = normalizeStoryOrder(parsed);
        if (normalized.length) {
          setStoryOrder(normalized);
        }
      } catch (error) {
        console.error("Erro ao ler a ordem do story:", error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FEED_ORDER_STORAGE_KEY, JSON.stringify(feedOrder));
  }, [feedOrder]);

  useEffect(() => {
    localStorage.setItem(STORY_ORDER_STORAGE_KEY, JSON.stringify(storyOrder));
  }, [storyOrder]);

  // Load layout preferences on component mount
  useEffect(() => {
    const loadLayoutPreferences = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/me/layout-preferences`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          return; // User doesn't have preferences yet, use defaults
        }

        const prefs = await response.json();

        // Update card/feed details
        setCardDetails({
          title: prefs.feedShowTitle,
          description: prefs.feedShowDescription,
          promotionalPrice: prefs.feedShowPrice,
          fullPrice: prefs.feedShowOriginalPrice,
          affiliateLink: prefs.feedShowProductUrl,
          coupon: prefs.feedShowCoupon,
          disclaimer: prefs.feedShowDisclaimer,
          salesQuantity: prefs.feedShowSalesQuantity,
          customText: prefs.feedShowCustomText,
        });

        // Update story details
        setStoryDetails({
          title: prefs.storyShowTitle,
          promotionalPrice: prefs.storyShowPrice,
          fullPrice: prefs.storyShowOriginalPrice,
          coupon: prefs.storyShowCoupon,
          customText: prefs.storyShowCustomText,
        });
        if (prefs.storyColors) {
          setStoryColors((prev) => ({ ...prev, ...prefs.storyColors }));
        }

        if (Array.isArray(prefs.feedOrder) && prefs.feedOrder.length) {
          const normalized = prefs.feedOrder
            .map((item: string) => {
              if (item === "promotionalPrice") return "price";
              if (item === "fullPrice") return "originalPrice";
              if (item === "affiliateLink") return "productUrl";
              return item;
            })
            .filter((item: string) =>
              DEFAULT_FEED_ORDER.includes(item as RenderFieldId)
            ) as RenderFieldId[];
          if (normalized.length) {
            setFeedOrder(normalized);
          }
        }

        if (Array.isArray(prefs.storyOrder) && prefs.storyOrder.length) {
          const normalized = prefs.storyOrder
            .map((item: string) => {
              if (item === "promotionalPrice") return "price";
              if (item === "fullPrice") return "originalPrice";
              return item;
            })
            .filter((item: string) =>
              DEFAULT_STORY_ORDER.includes(item as StoryFieldId)
            ) as StoryFieldId[];
          if (normalized.length) {
            setStoryOrder(normalized);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar preferências de layout:", error);
      }
    };

    loadLayoutPreferences();
  }, [apiBaseUrl]);

  useEffect(() => {
    const loadBrandConfig = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/me/brand-config`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setCtaText(data?.ctaText || "");
        setCouponText(data?.couponText || "");
        if (data?.templateId) {
          const templateMatch =
            customTemplates.find((template) => template.id === data.templateId) ||
            SYSTEM_TEMPLATES.find((template) => template.id === data.templateId);
          if (templateMatch) {
            setSelectedTemplate(templateMatch);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configurações da marca:", error);
      }
    };

    loadBrandConfig();
  }, [apiBaseUrl, customTemplates]);

  // Handle save layout preferences
  const handleSaveLayout = async () => {
    setIsSavingLayout(true);
    try {
      const layoutData = {
        // Feed preferences
        feedShowTitle: cardDetails.title,
        feedShowDescription: cardDetails.description,
        feedShowPrice: cardDetails.promotionalPrice,
        feedShowOriginalPrice: cardDetails.fullPrice,
        feedShowProductUrl: cardDetails.affiliateLink,
        feedShowCoupon: cardDetails.coupon,
        feedShowDisclaimer: cardDetails.disclaimer,
        feedShowSalesQuantity: cardDetails.salesQuantity,
        feedShowCustomText: cardDetails.customText,
        feedOrder,

        // Story preferences
        storyShowTitle: storyDetails.title,
        storyShowPrice: storyDetails.promotionalPrice,
        storyShowOriginalPrice: storyDetails.fullPrice,
        storyShowCoupon: storyDetails.coupon,
        storyShowCustomText: storyDetails.customText,
        storyOrder,
        storyColors,
      };

      const response = await fetch(`${apiBaseUrl}/api/me/layout-preferences`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(layoutData),
      });

      if (!response.ok) {
        throw new Error("Falha ao salvar preferências de layout");
      }

      await fetch(`${apiBaseUrl}/api/me/brand-config`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          couponText,
          ctaText,
          showCoupon: cardDetails.coupon || storyDetails.coupon,
        }),
      });

      showToast(
        "Layout salvo com sucesso! Suas preferências serão usadas na geração de artes.",
        "success"
      );
    } catch (error) {
      console.error("Erro ao salvar layout:", error);
      showToast("Erro ao salvar layout. Tente novamente.", "error");
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleTemplateSelect = async (template: TemplateOption) => {
    setSelectedTemplate(template);
    try {
      await fetch(`${apiBaseUrl}/api/me/brand-config`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templateId: template.id }),
      });
    } catch (error) {
      console.error("Erro ao atualizar template padrão:", error);
    }
  };

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

  const reorderItems = <T extends string>(items: T[], fromId: T, toId: T) => {
    const updated = [...items];
    const fromIndex = updated.indexOf(fromId);
    const toIndex = updated.indexOf(toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return updated;
    }

    updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, fromId);
    return updated;
  };

  const handleFeedDrop = (targetId: RenderFieldId) => {
    if (!isCardReorderMode || !draggingFeedId) return;
    setFeedOrder((prev) => reorderItems(prev, draggingFeedId, targetId));
    setDraggingFeedId(null);
    setDragOverFeedId(null);
    feedDragHandleActive.current = false;
  };

  const handleStoryDrop = (targetId: StoryFieldId) => {
    if (!isStoryReorderMode || !draggingStoryId) return;
    setStoryOrder((prev) => reorderItems(prev, draggingStoryId, targetId));
    setDraggingStoryId(null);
    setDragOverStoryId(null);
    storyDragHandleActive.current = false;
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
    () => mockProduct.imageUrl.replace(/^public\//, "/"),
    []
  );
  const formattedSalesQuantity = useMemo(() => {
    const quantity = mockProduct.salesQuantity;
    if (quantity < 1000) {
      return `${quantity} vendidos`;
    }
    return `${Math.floor(quantity / 1000)}mil+ vendidos`;
  }, []);

  const renderFeedControl = (fieldId: RenderFieldId) => {
    const wrapperProps = {
      "data-div-reorder-category-checkbox": true,
      draggable: isCardReorderMode,
      onDragOver: (event: DragEvent<HTMLDivElement>) => {
        if (isCardReorderMode) {
          event.preventDefault();
        }
      },
      onDragStart: (event: DragEvent<HTMLDivElement>) => {
        if (!isCardReorderMode || !feedDragHandleActive.current) {
          event.preventDefault();
          return;
        }
        setDraggingFeedId(fieldId);
      },
      onDragEnter: () => {
        if (isCardReorderMode) {
          setDragOverFeedId(fieldId);
        }
      },
      onDragLeave: () => {
        if (isCardReorderMode) {
          setDragOverFeedId((current) => (current === fieldId ? null : current));
        }
      },
      onDrop: () => handleFeedDrop(fieldId),
      className: `flex w-full items-center gap-2 transition-transform duration-150 ${draggingFeedId === fieldId ? "opacity-60" : ""
        } ${isCardReorderMode && dragOverFeedId === fieldId ? "translate-y-4" : ""}`,
    };

    const dragHandle = isCardReorderMode ? (
      <div
        data-reorder-btn
        onMouseDown={() => {
          feedDragHandleActive.current = true;
        }}
        onMouseUp={() => {
          feedDragHandleActive.current = false;
        }}
        onMouseLeave={() => {
          feedDragHandleActive.current = false;
        }}
        className="flex h-[40px] w-[40px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-white"
      >
        <Image
          src="/reordenar-icon.png"
          alt=""
          width={25}
          height={25}
          draggable={false}
        />
      </div>
    ) : null;

    switch (fieldId) {
      case "title":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
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
          </div>
        );
      case "description":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
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
          </div>
        );
      case "price":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
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
          </div>
        );
      case "originalPrice":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
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
          </div>
        );
      case "productUrl":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
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
          </div>
        );
      case "coupon":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
            <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
              <input
                id="cupom-de-desconto-card"
                type="text"
                value={couponText}
                onChange={(event) => setCouponText(event.target.value)}
                placeholder="Digite seu Cupom de desconto"
                className="w-full bg-transparent text-sm text-[var(--color-text-secondary)] outline-none"
              />
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
        );
      case "disclaimer":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
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
          </div>
        );
      case "salesQuantity":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
            <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
              <span>Quantidade de vendas</span>
              <input
                type="checkbox"
                checked={cardDetails.salesQuantity}
                onChange={(event) =>
                  setCardDetails((prev) => ({
                    ...prev,
                    salesQuantity: event.target.checked,
                  }))
                }
              />
            </label>
          </div>
        );
      case "customText":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
            <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
              <input
                id="meu-texto-personalizado-feed"
                type="text"
                value={ctaText}
                onChange={(event) => setCtaText(event.target.value)}
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
          </div>
        );
      default:
        return null;
    }
  };

  const renderStoryControl = (fieldId: StoryFieldId) => {
    const wrapperProps = {
      "data-div-reorder-category-checkbox": true,
      draggable: isStoryReorderMode,
      onDragOver: (event: DragEvent<HTMLDivElement>) => {
        if (isStoryReorderMode) {
          event.preventDefault();
        }
      },
      onDragStart: (event: DragEvent<HTMLDivElement>) => {
        if (!isStoryReorderMode || !storyDragHandleActive.current) {
          event.preventDefault();
          return;
        }
        setDraggingStoryId(fieldId);
      },
      onDragEnter: () => {
        if (isStoryReorderMode) {
          setDragOverStoryId(fieldId);
        }
      },
      onDragLeave: () => {
        if (isStoryReorderMode) {
          setDragOverStoryId((current) => (current === fieldId ? null : current));
        }
      },
      onDrop: () => handleStoryDrop(fieldId),
      className: `flex w-full items-center gap-2 transition-transform duration-150 ${draggingStoryId === fieldId ? "opacity-60" : ""
        } ${isStoryReorderMode && dragOverStoryId === fieldId ? "translate-y-4" : ""}`,
    };

    const colorPicker = (value: string, onChange: (color: string) => void) => (
      <div
        data-color-render
        className={`flex items-center rounded-lg border border-[var(--color-border)] bg-white ${isStoryReorderMode
          ? "h-[40px] w-[40px] justify-center"
          : "w-[110px] gap-1 px-[4px] py-[4px]"
          }`}
      >
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div
            className="h-[30px] w-[30px] cursor-pointer rounded border-2 border-[var(--color-border)]"
            style={{ backgroundColor: value }}
          />
        </div>
        {!isStoryReorderMode && (
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-[65px] border-b border-[var(--color-border)] bg-transparent text-xs text-black outline-none"
            placeholder="#000000"
          />
        )}
      </div>
    );

    const dragHandle = isStoryReorderMode ? (
      <div
        data-reorder-btn
        onMouseDown={() => {
          storyDragHandleActive.current = true;
        }}
        onMouseUp={() => {
          storyDragHandleActive.current = false;
        }}
        onMouseLeave={() => {
          storyDragHandleActive.current = false;
        }}
        className="flex h-[40px] w-[40px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-white"
      >
        <Image
          src="/reordenar-icon.png"
          alt=""
          width={25}
          height={25}
          draggable={false}
        />
      </div>
    ) : null;

    switch (fieldId) {
      case "title":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
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
            {colorPicker(storyColors.title, (color) =>
              setStoryColors((prev) => ({ ...prev, title: color }))
            )}
          </div>
        );
      case "price":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
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
            {colorPicker(storyColors.promotionalPrice, (color) =>
              setStoryColors((prev) => ({ ...prev, promotionalPrice: color }))
            )}
          </div>
        );
      case "originalPrice":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
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
            {colorPicker(storyColors.fullPrice, (color) =>
              setStoryColors((prev) => ({ ...prev, fullPrice: color }))
            )}
          </div>
        );
      case "coupon":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
            <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
              <input
                id="cupom-de-desconto-story"
                type="text"
                value={couponText}
                onChange={(event) => setCouponText(event.target.value)}
                placeholder="Digite seu Cupom de Desconto"
                className="w-full bg-transparent text-sm text-[var(--color-text-secondary)] outline-none"
              />
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
            {colorPicker(storyColors.coupon, (color) =>
              setStoryColors((prev) => ({ ...prev, coupon: color }))
            )}
          </div>
        );
      case "customText":
        return (
          <div key={fieldId} {...wrapperProps}>
            {dragHandle}
            <label className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
              <input
                type="text"
                value={ctaText}
                onChange={(event) => setCtaText(event.target.value)}
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
            {colorPicker(storyColors.customText, (color) =>
              setStoryColors((prev) => ({ ...prev, customText: color }))
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderFeedPreviewField = (fieldId: RenderFieldId) => {
    switch (fieldId) {
      case "title":
        return cardDetails.title ? (
          <p key={fieldId} className="font-semibold" style={{ color: "#000000" }}>
            🛍️ {mockProduct.title}
          </p>
        ) : null;
      case "description":
        return cardDetails.description ? (
          <p key={fieldId} style={{ color: "#000000" }}>
            {mockProduct.description}
          </p>
        ) : null;
      case "price":
        return cardDetails.promotionalPrice ? (
          <p key={fieldId} style={{ color: "#000000" }}>
            💸 por{" "}
            <span className="font-semibold">
              R$ {mockProduct.price.toFixed(2).replace(".", ",")}
            </span>{" "}
            🚨🚨
          </p>
        ) : null;
      case "originalPrice":
        return cardDetails.fullPrice ? (
          <p key={fieldId} style={{ color: "#000000" }}>
            De:{" "}
            <span className="line-through">
              R$ {mockProduct.originalPrice.toFixed(2).replace(".", ",")}
            </span>
          </p>
        ) : null;
      case "productUrl":
        return cardDetails.affiliateLink ? (
          <div key={fieldId} style={{ color: "#000000" }}>
            <p style={{ marginBottom: 0 }}>👉Link p/ comprar:</p>
            <p className="break-all">{mockProduct.productUrl}</p>
          </div>
        ) : null;
      case "coupon":
        return cardDetails.coupon ? (
          <p key={fieldId} style={{ color: "#000000" }}>
            <span className="font-semibold">Cupom:</span>{" "}
            {couponText.trim() ? couponText : mockProduct.coupon}
          </p>
        ) : null;
      case "disclaimer":
        return cardDetails.disclaimer ? (
          <p key={fieldId} className="text-xs italic" style={{ color: "#000000" }}>
            *Promoção sujeita a alteração a qualquer momento
          </p>
        ) : null;
      case "salesQuantity":
        return cardDetails.salesQuantity ? (
          <p key={fieldId} style={{ color: "#000000" }}>
            <span className="font-semibold">Vendas:</span> {formattedSalesQuantity}
          </p>
        ) : null;
      case "customText":
        return cardDetails.customText && ctaText.trim() ? (
          <p key={fieldId} style={{ color: "#000000" }}>
            {ctaText}
          </p>
        ) : null;
      default:
        return null;
    }
  };

  const renderStoryPreviewField = (fieldId: StoryFieldId) => {
    switch (fieldId) {
      case "title":
        return storyDetails.title ? (
          <p key={fieldId} className="text-sm font-bold leading-tight" style={{ color: storyColors.title }}>
            {mockProduct.title}
          </p>
        ) : null;
      case "price":
        return storyDetails.promotionalPrice ? (
          <p key={fieldId} className="text-base font-bold" style={{ color: storyColors.promotionalPrice }}>
            R$ {mockProduct.price.toFixed(2).replace(".", ",")}
          </p>
        ) : null;
      case "originalPrice":
        return storyDetails.fullPrice ? (
          <p key={fieldId} className="text-xs line-through opacity-80" style={{ color: storyColors.fullPrice }}>
            R$ {mockProduct.originalPrice.toFixed(2).replace(".", ",")}
          </p>
        ) : null;
      case "coupon":
        return storyDetails.coupon ? (
          <p key={fieldId} className="rounded-lg bg-black/10 px-2 py-0.5 text-xs font-semibold" style={{ color: storyColors.coupon }}>
            {couponText.trim() ? couponText : mockProduct.coupon}
          </p>
        ) : null;
      case "customText":
        return storyDetails.customText && ctaText.trim() ? (
          <p key={fieldId} className="text-xs font-semibold" style={{ color: storyColors.customText }}>
            {ctaText}
          </p>
        ) : null;
      default:
        return null;
    }
  };

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

      {/* Div de imagem de fundo */}
      <div id="imagem-de-fundo" className="flex flex-col gap-6">
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
                  onClick={() => handleTemplateSelect(template)}
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

        {/* Div definição de Layout */}
        <div className={`rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] ${!useRowLayout ? 'max-w-[700px]' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
                Definição de Layout
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Personalize as informações que aparecerão nas artes geradas para cada plataforma.
              </p>
            </div>
            <button id="save-layout-btn"
              onClick={handleSaveLayout}
              disabled={isSavingLayout}
              className="ml-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingLayout ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Salvar Layout
                </>
              )}
            </button>
          </div>
          <div className={`mt-6 flex gap-6 ${useRowLayout ? 'flex-row' : 'flex-col'}`}>
            {/* Card para Feed/Telegram/WhatsApp */}
            <div id='card-para-feed' className="max-w-[700px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="flex flex-col gap-6 sm:flex-row">
                {/* Informações do card */}
                <div id='informacoes-do-card' className="w-full sm:w-[400px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p
                        id="informacoes-do-card-title"
                        className="mb-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]"
                      >
                        Informações do card
                      </p>
                      <div className="relative">
                        <div className="group  flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-text-secondary)]">
                          i
                          <div className="pointer-events-none absolute -top-2 left-1/2 w-[240px] -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs text-[var(--color-text-secondary)] opacity-0 shadow-[var(--shadow-sm)] transition-opacity group-hover:opacity-100">
                            A maioria dos links de afiliado não possui algumas informações como <strong>descrição</strong> e <strong>quantidade de vendas</strong>. A arte gerada só terá as opções que efetivamente existirem no link enviado.
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      id="reordenar-informacoes-do-card"
                      onClick={() => setIsCardReorderMode((prev) => !prev)}
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${isCardReorderMode
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                        }`}
                      type="button"
                    >
                      {isCardReorderMode ? "Salvar" : "Reordenar"}
                    </button>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                    {feedOrder.map(renderFeedControl)}
                  </div>
                </div>

                {/* Preview do card */}
                <div id='preview-do-card' className="w-full sm:w-[250px] flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                    Preview
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="relative h-[250px] w-[200px] overflow-hidden border border-[var(--color-border)] bg-white">
                      <div className="relative h-full w-full">
                        <Image
                          src={templatePreviewSrc}
                          alt="Template selecionado"
                          fill
                          className="object-contain"
                          sizes="(max-width: 1024px) 70vw, 320px"
                          unoptimized={selectedTemplate.source === "custom"}
                          loader={
                            selectedTemplate.source === "custom"
                              ? ({ src }) => src
                              : undefined
                          }
                        />
                        <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '30px' }}>
                          <div id='tamanho-imagem-produto-card' className="relative h-[140px] w-[140px]">
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
                      {feedOrder.map(renderFeedPreviewField)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card para Stories */}
            <div id='card-para-stories' className="max-w-[700px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="flex flex-col gap-6 sm:flex-row">
                {/* Informações do story */}
                <div id='informacoes-do-story' className="w-full sm:w-[400px]">
                  <div className="flex items-center justify-between">
                    <p
                      id="informacoes-do-story-title"
                      className="mb-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]"
                    >
                      Informações do story
                    </p>
                    <button
                      id="reordenar-informacoes-do-story"
                      onClick={() => setIsStoryReorderMode((prev) => !prev)}
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${isStoryReorderMode
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                        }`}
                      type="button"
                    >
                      {isStoryReorderMode ? "Salvar" : "Reordenar"}
                    </button>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                    {storyOrder.map(renderStoryControl)}
                  </div>
                </div>

                {/* Preview do story */}
                <div id='preview-do-story' className="w-full sm:w-[250px] flex flex-col items-center">
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
                        unoptimized={selectedTemplate.source === "custom"}
                        loader={
                          selectedTemplate.source === "custom"
                            ? ({ src }) => src
                            : undefined
                        }
                      />
                      <div className="absolute inset-0 flex flex-col">
                        {/* 1/6 superior vazio */}
                        <div style={{ height: 'calc(100% / 5.5)' }} />

                        {/* 4/6 central com conteúdo principal */}
                        <div className="flex flex-col items-center justify-around text-center" style={{ height: 'calc(100% * 30 / 50)', paddingLeft: '15%', paddingRight: '15%' }}>
                          <div id='tamanho-imagem-produto-story' className="relative mb-2 h-[100px] w-[100px] flex-shrink-0">
                            <Image
                              src={productImageSrc}
                              alt={mockProduct.title}
                              fill
                              className="object-contain"
                              sizes="100px"
                            />
                          </div>
                          <div className="space-y-1 flex-shrink min-h-0">
                            {storyOrder.map(renderStoryPreviewField)}
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
              <strong>2) </strong>Após clicar no botão e o temhplate padrão se abrir, clique em <strong>Arquivo</strong> &gt; <strong>Fazer uma cópia</strong>, conforme o vídeo abaixo.
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
