import { describe, expect, it } from "vitest";
import { scraperRouter } from "../../src/scraping/index.js";
import { AFFILIATE_LINKS } from "../../src/scraping/valid-links.js";
import { MarketplaceEnum } from "../../src/scraping/types.js";

const inferMarketplace = (url: string) => {
  if (url.includes("shopee") || url.includes("s.shopee.com")) {
    return MarketplaceEnum.SHOPEE;
  }
  if (url.includes("mercadolivre") || url.includes("mercadolibre")) {
    return MarketplaceEnum.MERCADO_LIVRE;
  }
  if (url.includes("amazon") || url.includes("a.co")) {
    return MarketplaceEnum.AMAZON;
  }
  if (url.includes("magalu") || url.includes("magazineluiza") || url.includes("divulgador.magalu")) {
    return MarketplaceEnum.MAGALU;
  }
  return null;
};

describe("scraperRouter.detectMarketplace", () => {
  it("classifies all affiliate links", () => {
    AFFILIATE_LINKS.forEach((link) => {
      const expected = inferMarketplace(link);
      const detected = scraperRouter.detectMarketplace(link);
      expect(detected).toBe(expected);
    });
  });
});
