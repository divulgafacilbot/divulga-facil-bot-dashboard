import fs from "fs";
import path from "path";

const FILE_NAME = "LINKS_VALIDOS_AFILIADOS.md";

const extractLinks = (content: string) =>
  content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("http"));

const resolveLinksPath = () => {
  const candidates = [
    path.resolve(process.cwd(), FILE_NAME),
    path.resolve(process.cwd(), "..", FILE_NAME),
    path.resolve(process.cwd(), "..", "..", FILE_NAME),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
};

const loadAffiliateLinks = () => {
  try {
    const filePath = resolveLinksPath();
    const content = fs.readFileSync(filePath, "utf-8");
    return extractLinks(content);
  } catch (error) {
    console.error("Erro ao carregar LINKS_VALIDOS_AFILIADOS.md:", error);
    return [];
  }
};

export const AFFILIATE_LINKS = loadAffiliateLinks();
