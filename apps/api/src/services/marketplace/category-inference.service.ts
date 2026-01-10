/**
 * Category Inference Service
 * Infers product category from title and description using keyword matching + OpenAI fallback
 */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Eletrônicos': [
    'celular', 'smartphone', 'notebook', 'tablet', 'fone', 'headphone', 'mouse', 'teclado',
    'monitor', 'tv', 'smart tv', 'console', 'playstation', 'xbox', 'nintendo', 'câmera',
    'gopro', 'drone', 'carregador', 'cabo', 'adaptador', 'bateria', 'powerbank',
  ],
  'Moda': [
    'camiseta', 'camisa', 'blusa', 'vestido', 'calça', 'jeans', 'short', 'saia', 'tênis',
    'sapato', 'sandália', 'chinelo', 'bota', 'meia', 'roupa', 'lingerie', 'sutiã', 'calcinha',
    'cueca', 'boxer', 'jaqueta', 'casaco', 'moletom', 'blazer', 'terno',
  ],
  'Beleza': [
    'maquiagem', 'batom', 'base', 'corretivo', 'máscara', 'rímel', 'sombra', 'blush',
    'perfume', 'colônia', 'shampoo', 'condicionador', 'creme', 'hidratante', 'protetor solar',
    'sabonete', 'esmalte', 'acetona', 'pincel', 'escova', 'secador', 'chapinha',
  ],
  'Casa e Decoração': [
    'mesa', 'cadeira', 'sofá', 'cama', 'colchão', 'travesseiro', 'lençol', 'edredom',
    'cortina', 'tapete', 'luminária', 'lustre', 'quadro', 'espelho', 'vaso', 'planta',
    'almofada', 'rack', 'estante', 'guarda-roupa', 'cômoda', 'criado-mudo',
  ],
  'Esporte e Lazer': [
    'bola', 'raquete', 'luva', 'chuteira', 'bicicleta', 'patins', 'skate', 'halteres',
    'musculação', 'academia', 'yoga', 'natação', 'camping', 'barraca', 'mochila',
    'tênis esportivo', 'shorts esportivo', 'legging', 'top', 'suplemento', 'whey',
  ],
  'Alimentos e Bebidas': [
    'chocolate', 'café', 'chá', 'suco', 'refrigerante', 'cerveja', 'vinho', 'whisky',
    'açúcar', 'sal', 'tempero', 'molho', 'azeite', 'óleo', 'arroz', 'feijão', 'macarrão',
  ],
  'Livros': [
    'livro', 'romance', 'ficção', 'autobiografia', 'biografia', 'história', 'poesia',
    'conto', 'infantil', 'juvenil', 'educativo', 'didático', 'técnico', 'mangá', 'hq',
  ],
  'Brinquedos': [
    'boneca', 'carrinho', 'lego', 'quebra-cabeça', 'jogo', 'pelúcia', 'ursinho',
    'brinquedo educativo', 'massinha', 'slime', 'nerf', 'hot wheels', 'barbie',
  ],
  'Pet': [
    'ração', 'petisco', 'coleira', 'guia', 'caminha', 'casinha', 'brinquedo pet',
    'arranhador', 'caixa de areia', 'comedouro', 'bebedouro', 'shampoo pet',
  ],
  'Automotivo': [
    'pneu', 'bateria carro', 'óleo motor', 'filtro', 'para-choque', 'farol', 'retrovisor',
    'tapete carro', 'capinha volante', 'som automotivo', 'alarme', 'câmera ré',
  ],
};

export class CategoryInferenceService {
  /**
   * Infer category from product title and description
   * Uses keyword matching first, OpenAI as fallback
   */
  async inferCategory(title: string, description?: string): Promise<string> {
    // Try keyword matching first
    const keywordCategory = this.inferFromKeywords(title, description);
    if (keywordCategory) {
      return keywordCategory;
    }

    // Fallback to OpenAI (if API key available)
    const openAICategory = await this.inferFromOpenAI(title, description);
    if (openAICategory) {
      return openAICategory;
    }

    // Default fallback
    return 'Outros';
  }

  /**
   * Infer category using keyword matching
   */
  private inferFromKeywords(title: string, description?: string): string | null {
    const text = `${title} ${description || ''}`.toLowerCase();

    const scores: Record<string, number> = {};

    // Count keyword matches for each category
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score++;
        }
      }
      if (score > 0) {
        scores[category] = score;
      }
    }

    // Return category with highest score
    if (Object.keys(scores).length === 0) {
      return null;
    }

    const sortedCategories = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return sortedCategories[0][0];
  }

  /**
   * Infer category using OpenAI (fallback)
   */
  private async inferFromOpenAI(title: string, description?: string): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log('[CategoryInference] OpenAI API key not configured');
      return null;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Você é um assistente que classifica produtos em categorias. Responda APENAS com o nome da categoria, nada mais. Categorias possíveis: ${Object.keys(CATEGORY_KEYWORDS).join(', ')}, Outros.`,
            },
            {
              role: 'user',
              content: `Classifique este produto:\nTítulo: ${title}\nDescrição: ${description || 'N/A'}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        console.error('[CategoryInference] OpenAI API error:', response.status);
        return null;
      }

      const data = await response.json();
      const category = data.choices?.[0]?.message?.content?.trim();

      if (category && Object.keys(CATEGORY_KEYWORDS).includes(category)) {
        return category;
      }

      return null;
    } catch (error) {
      console.error('[CategoryInference] OpenAI error:', error);
      return null;
    }
  }

  /**
   * Get all available categories
   */
  getAvailableCategories(): string[] {
    return [...Object.keys(CATEGORY_KEYWORDS), 'Outros'];
  }
}

export const categoryInferenceService = new CategoryInferenceService();
