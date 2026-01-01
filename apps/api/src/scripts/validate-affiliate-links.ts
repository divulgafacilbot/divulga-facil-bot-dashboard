import { AFFILIATE_LINKS } from "../scraping/valid-links.js";
import { scraperRouter } from "../scraping/index.js";

const runValidation = async () => {
  const results = [];

  for (const link of AFFILIATE_LINKS) {
    const marketplace = scraperRouter.detectMarketplace(link);
    const scrapeResult = marketplace
      ? await scraperRouter.scrape(link, { fields: ["imageUrl", "title", "price"] })
      : null;
    results.push({
      link,
      marketplace: marketplace || "UNKNOWN",
      success: scrapeResult?.success ?? false,
      error: scrapeResult?.error,
    });
  }

  results.forEach((result) => {
    if (result.success) {
      console.log(`[OK] [${result.marketplace}] ${result.link}`);
      return;
    }
    console.log(`[FAIL] [${result.marketplace}] ${result.link} ${result.error ?? ""}`.trim());
  });
};

runValidation().catch((error) => {
  console.error("Failed to validate affiliate links:", error);
  process.exit(1);
});
