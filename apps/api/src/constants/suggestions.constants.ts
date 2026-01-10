export const SUGGESTION_CONSTANTS = {
  // Marketplaces
  MARKETPLACES: ['MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU'] as const,

  // Marketplace site domains for Google Search restriction
  MARKETPLACE_SITES: {
    MERCADO_LIVRE: 'mercadolivre.com.br',
    SHOPEE: 'shopee.com.br',
    AMAZON: 'amazon.com.br',
    MAGALU: 'magazineluiza.com.br',
  } as const,

  // Cache
  CACHE_TTL_DAYS: 30,

  // Sugestões por marketplace
  SUGGESTIONS_PER_MARKETPLACE: 5,

  // Janela de análise de métricas
  METRICS_WINDOW_DAYS: 30,

  // Categorias permitidas (lista fechada)
  ALLOWED_CATEGORIES: [
    'Eletrônicos',
    'Moda',
    'Casa',
    'Beleza',
    'Esporte',
    'Livros',
    'Brinquedos',
    'Alimentos',
    'Ferramentas',
    'Automotivo',
    'Pet',
    'Jardim',
    'Outros',
  ] as const,

  // Faixas de preço alvo por marketplace (BRL)
  TARGET_PRICE_BANDS: {
    MERCADO_LIVRE: ['R$ 20–80', 'R$ 80–200', 'R$ 200–500'],
    SHOPEE: ['R$ 10–50', 'R$ 50–150', 'R$ 150–300'],
    AMAZON: ['R$ 50–150', 'R$ 150–400', 'R$ 400–1000'],
    MAGALU: ['R$ 30–100', 'R$ 100–300', 'R$ 300–700'],
  },

  // Proporção de categorias
  DOMINANT_CATEGORIES_COUNT: 4, // 4 de 5 produtos
  SECONDARY_CATEGORIES_COUNT: 1, // 1 de 5 produtos

  // Rotação de campanhas
  CAMPAIGN_COOLDOWN_DAYS: 5, // Não repetir campanha por 5 dias
  CAMPAIGN_SUBSTITUTION_INDEX: 4, // Substituir apenas o 5º item (index 4)
} as const;

export type Marketplace = typeof SUGGESTION_CONSTANTS.MARKETPLACES[number];
export type AllowedCategory = typeof SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES[number];
