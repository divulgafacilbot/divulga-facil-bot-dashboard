// Mock product data - matches ProductData interface from scraping
export const mockProduct = {
  // Campos do scraping (ProductData)
  title: "Smartwatch Relógio Ultra 2 Pro",
  description: "O Smart Watch T800 Ultra, a nova geração de relógios inteligentes que combina estilo e funcionalidade.",
  price: 89.99, // promotionalPrice
  originalPrice: 189.99, // fullPrice
  discountPercentage: 53,
  imageUrl: "public/relógio-mock.png", // imagem
  productUrl: "https://shopee.com.br/seu-link", // affiliateLink
  marketplace: "SHOPEE" as const,
  rating: 4.8,
  reviewCount: 1234,
  salesQuantity: 28500,
  seller: "Tech Store Official",
  inStock: true,

  // Campos adicionais (não vêm do scraping)
  coupon: "desconto10",
  disclaimer: "Oferta válida enquanto durar o estoque",
  customText: "",
};
