import type { LayoutPreferences } from "../services/layout-preferences.service.js";
import type { ScrapeField } from "./types.js";

export const getRequiredScrapeFields = (layout?: LayoutPreferences): ScrapeField[] => {
  const fields = new Set<ScrapeField>(["imageUrl"]);

  if (!layout) {
    fields.add("title");
    fields.add("price");
    fields.add("originalPrice");
    fields.add("description");
    fields.add("salesQuantity");
    return Array.from(fields);
  }

  if (layout.feedShowTitle || layout.storyShowTitle) {
    fields.add("title");
  }

  if (layout.feedShowDescription) {
    fields.add("description");
  }

  if (layout.feedShowPrice || layout.storyShowPrice) {
    fields.add("price");
  }

  if (layout.feedShowOriginalPrice || layout.storyShowOriginalPrice) {
    fields.add("originalPrice");
  }

  if (layout.feedShowSalesQuantity) {
    fields.add("salesQuantity");
  }

  return Array.from(fields);
};
