# Orientações de Scraping - Shopee

## MÉTODO OFICIAL: Iframely com URL Canônica + Imagem Limpa

Este documento descreve o método **oficial e recomendado** para extração de dados de produtos da Shopee. Este método deve ser usado como **principal**, com outros métodos como **fallback**.

---

## Resumo Executivo

| Item | Valor |
|------|-------|
| **Método Principal** | Iframely API |
| **URL Requerida** | Formato canônico: `https://shopee.com.br/product/{shopId}/{itemId}` |
| **Dados Obtidos** | Título, Preço (mínimo), Imagem (limpa), Marca, Descrição |
| **Chave de API** | `IFRAMELY_API_KEY` no `.env` |
| **Arquivo Principal** | `apps/api/src/scraping/shopee.scraper.ts` |

---

## Por que este método funciona?

### Problema
A Shopee possui proteção antibot agressiva que bloqueia:
- APIs diretas (retorna 403)
- Puppeteer/Playwright (detecta automação)
- Proxies comuns (requer proxies residenciais premium)

### Solução
A Shopee mantém **meta tags Open Graph** para permitir preview em redes sociais. O Iframely extrai essas meta tags de forma confiável.

### Descoberta Importante: Imagem Limpa
O Iframely retorna **duas imagens**:
1. `promo-dim-*` - Imagem com overlay de preço (ERRADA)
2. `br-*` - Imagem limpa do produto (CORRETA)

**Devemos filtrar e usar a segunda imagem.**

---

## Fluxo Completo de Implementação

### ETAPA 1: Receber URL do Usuário

Formatos possíveis de entrada:
```
https://s.shopee.com.br/4VWBoPbIzC              (curta - afiliado)
https://shopee.com.br/Produto-i.309710017.22697448516  (com slug)
https://shopee.com.br/opaanlp/309710017/22697448516    (opaanlp)
https://shopee.com.br/product/309710017/22697448516    (canônica)
```

### ETAPA 2: Resolver URL (Seguir Redirects)

URLs curtas precisam ser resolvidas para obter a URL final.

```typescript
// Localização: src/scraping/baseScraper.ts (método herdado)

protected async resolveUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    const resolved = (response.request as { res?: { responseUrl?: string } })?.res?.responseUrl;
    return resolved || url;
  } catch (error) {
    return url;
  }
}
```

**Exemplo de resolução:**
```
Entrada:  https://s.shopee.com.br/4VWBoPbIzC
   ↓ (HTTP 301 Redirect)
Saída:    https://shopee.com.br/opaanlp/309710017/22697448516?__mobile__=1&...
```

### ETAPA 3: Extrair IDs do Produto

Extrair `shopId` e `itemId` da URL usando regex.

```typescript
// Localização: src/scraping/shopee.scraper.ts

private extractIds(url: string): { shopId: string; itemId: string } | null {
  const patterns = [
    /\/product\/(\d+)\/(\d+)/,      // /product/309710017/22697448516
    /\/opaanlp\/(\d+)\/(\d+)/,      // /opaanlp/309710017/22697448516
    /i\.(\d+)\.(\d+)/,              // i.309710017.22697448516
    /\/(\d{6,})\/(\d{6,})/,         // /309710017/22697448516
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { shopId: match[1], itemId: match[2] };
    }
  }
  return null;
}
```

### ETAPA 4: Montar URL Canônica

Converter qualquer formato para a URL canônica que o Iframely reconhece.

```typescript
// Localização: src/scraping/shopee.scraper.ts

private toCanonicalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("shopee")) return null;
    const path = parsed.pathname.replace(/\/+$/, "");

    // Padrão opaanlp: /opaanlp/309710017/22697448516
    const opaanlpMatch = path.match(/\/opaanlp\/(\d+)\/(\d+)/i);
    if (opaanlpMatch) {
      return `https://shopee.com.br/product/${opaanlpMatch[1]}/${opaanlpMatch[2]}`;
    }

    // Padrão dotted: i.309710017.22697448516
    const dottedMatch = path.match(/i\.(\d+)\.(\d+)/);
    if (dottedMatch) {
      return `https://shopee.com.br/product/${dottedMatch[1]}/${dottedMatch[2]}`;
    }

    // Padrão slash: /309710017/22697448516
    const slashMatch = path.match(/\/(\d+)\/(\d+)/);
    if (slashMatch) {
      return `https://shopee.com.br/product/${slashMatch[1]}/${slashMatch[2]}`;
    }
  } catch {}
  return null;
}
```

**Exemplo:**
```
Entrada:  https://shopee.com.br/opaanlp/309710017/22697448516?params...
Saída:    https://shopee.com.br/product/309710017/22697448516
```

### ETAPA 5: Chamar API Iframely

Fazer requisição ao Iframely com a **URL canônica**.

```typescript
// Localização: src/scraping/shopee.scraper.ts
// Método: tryIframelyApi

private async tryIframelyApi(
  resolvedUrl: string,
  originalUrl: string,
  options?: ScrapeOptions
): Promise<ProductData | null> {
  const apiKey = process.env.IFRAMELY_API_KEY;
  if (!apiKey) {
    console.log("[Iframely] SKIP: IFRAMELY_API_KEY não configurada");
    return null;
  }

  console.log("[Iframely] Fazendo requisição...");

  const response = await axios.get("https://iframe.ly/api/iframely", {
    timeout: 15000,
    params: {
      url: resolvedUrl,  // DEVE ser a URL canônica!
      api_key: apiKey
    },
    headers: { Accept: "application/json" },
  });

  // ... processamento da resposta
}
```

**Requisição HTTP:**
```
GET https://iframe.ly/api/iframely
    ?url=https://shopee.com.br/product/309710017/22697448516
    &api_key=sua_chave_aqui
```

### ETAPA 6: Processar Resposta - SELECIONAR IMAGEM LIMPA

**CRÍTICO:** O Iframely retorna múltiplas imagens. Devemos filtrar para usar a imagem LIMPA (sem overlay de preço).

```typescript
// Localização: src/scraping/shopee.scraper.ts
// Dentro do método tryIframelyApi, após receber a resposta

const data = response.data;
const meta = data?.meta || {};
const title = meta.title;
const description = meta.description;

// Coletar todas as imagens disponíveis
const images = [
  ...(data?.links?.image?.map((item: { href?: string }) => item.href) || []),
  ...(data?.links?.thumbnail?.map((item: { href?: string }) => item.href) || [])
].filter(Boolean);

// ╔════════════════════════════════════════════════════════════════════════════╗
// ║  IMPORTANTE: Filtrar imagens para usar a LIMPA (sem overlay promo-dim)     ║
// ╚════════════════════════════════════════════════════════════════════════════╝
const cleanImages = images.filter((img: string) => !img.includes("promo-dim"));
const imageUrl = cleanImages[0] || images[0] || data?.links?.icon?.[0]?.href || "";

console.log("[Iframely] Images:", images.length, `(${cleanImages.length} sem overlay)`);
console.log("[Iframely] Usando imagem limpa:", cleanImages.length > 0 ? "SIM" : "NÃO (fallback para promo)");
```

**Exemplo de imagens retornadas:**
```
thumbnail[0]: https://down-br.img.susercontent.com/file/promo-dim-01001afeb5323feda62d6ea99f4e55da3c5a
              ^^^^^^^^^ ERRADA - tem overlay de preço

thumbnail[1]: https://down-br.img.susercontent.com/file/br-11134207-7r98o-ltplcayqpnahfd
              ^^^^^^^^^ CORRETA - imagem limpa do produto
```

### ETAPA 7: Extrair Preço dos Metadados

```typescript
// Localização: src/scraping/shopee.scraper.ts
// Dentro do método tryIframelyApi

let price: number | null = null;

const priceFields = [
  meta.price,
  meta['product:price:amount'],
  meta['og:price:amount'],
  meta.amount,
  meta['price:amount'],
  meta['product:sale_price:amount'],
];

for (const priceField of priceFields) {
  if (priceField) {
    const extracted = typeof priceField === 'number'
      ? priceField
      : this.extractPrice(String(priceField));
    if (extracted !== null) {
      price = extracted;
      console.log(`[Iframely] Preço encontrado: R$ ${price}`);
      break;
    }
  }
}
```

### ETAPA 8: Montar e Retornar ProductData

```typescript
// Localização: src/scraping/shopee.scraper.ts
// Final do método tryIframelyApi

return {
  title: title,
  description: description,
  price: price,
  originalPrice: null,  // Não disponível via OG tags
  discountPercentage: undefined,
  imageUrl: imageUrl,   // Imagem LIMPA (filtrada)
  productUrl: originalUrl,
  marketplace: "SHOPEE" as const,
  rating: undefined,
  reviewCount: undefined,
  salesQuantity: undefined,
  seller: meta.brand,
  inStock: meta.availability?.includes("InStock") || true,
  scrapedAt: new Date(),
};
```

---

## Código Completo do Método tryIframelyApi

```typescript
private async tryIframelyApi(
  resolvedUrl: string,
  originalUrl: string,
  options?: ScrapeOptions
): Promise<ProductData | null> {
  const apiKey = process.env.IFRAMELY_API_KEY;
  if (!apiKey) {
    console.log("[Iframely] SKIP: IFRAMELY_API_KEY não configurada");
    return null;
  }

  console.log("[Iframely] Fazendo requisição...");

  try {
    const response = await axios.get("https://iframe.ly/api/iframely", {
      timeout: 15000,
      params: { url: resolvedUrl, api_key: apiKey },
      headers: { Accept: "application/json" },
    });

    console.log("[Iframely] Status:", response.status);

    const data = response.data;
    const meta = data?.meta || {};
    const title = meta.title;
    const description = meta.description;

    // Coletar imagens
    const images = [
      ...(data?.links?.image?.map((item: { href?: string }) => item.href) || []),
      ...(data?.links?.thumbnail?.map((item: { href?: string }) => item.href) || [])
    ].filter(Boolean);

    // ═══════════════════════════════════════════════════════════════════════
    // FILTRAR IMAGENS: Priorizar imagens SEM overlay "promo-dim"
    // ═══════════════════════════════════════════════════════════════════════
    const cleanImages = images.filter((img: string) => !img.includes("promo-dim"));
    const imageUrl = cleanImages[0] || images[0] || data?.links?.icon?.[0]?.href || "";

    console.log("[Iframely] Title:", title ? title.substring(0, 50) + "..." : "N/A");
    console.log("[Iframely] Images:", images.length, `(${cleanImages.length} sem overlay)`);
    console.log("[Iframely] Image URL:", imageUrl ? imageUrl.substring(0, 50) + "..." : "N/A");
    console.log("[Iframely] Usando imagem limpa:", cleanImages.length > 0 ? "SIM" : "NÃO");

    // Extrair preço
    let price: number | null = null;
    const priceFields = [
      meta.price,
      meta['product:price:amount'],
      meta['og:price:amount'],
      meta.amount,
      meta['price:amount'],
      meta['product:sale_price:amount'],
    ];

    for (const priceField of priceFields) {
      if (priceField) {
        const extracted = typeof priceField === 'number'
          ? priceField
          : this.extractPrice(String(priceField));
        if (extracted !== null) {
          price = extracted;
          console.log(`[Iframely] Preço encontrado: R$ ${price}`);
          break;
        }
      }
    }

    // Verificar se não é preview genérico
    if (this.isGenericShopeePreview(title || "", imageUrl, resolvedUrl)) {
      console.log("[Iframely] Preview genérico detectado, rejeitando");
      return null;
    }

    // Validar dados mínimos
    if (!title || !imageUrl) {
      console.log("[Iframely] Dados insuficientes");
      return null;
    }

    return {
      title,
      description,
      price,
      originalPrice: null,
      discountPercentage: undefined,
      imageUrl,
      productUrl: originalUrl,
      marketplace: "SHOPEE" as const,
      rating: undefined,
      reviewCount: undefined,
      salesQuantity: undefined,
      seller: meta.brand,
      inStock: meta.availability?.includes("InStock") || true,
      scrapedAt: new Date(),
    };

  } catch (error: any) {
    console.log("[Iframely] Erro:", error.message);
    return null;
  }
}
```

---

## Configuração no Método Principal (scrape)

O método Iframely deve ser o **primeiro** na lista de métodos e deve usar a **URL canônica**:

```typescript
// Localização: src/scraping/shopee.scraper.ts
// Método: async scrape(url: string, options?: ScrapeOptions)

async scrape(url: string, options?: ScrapeOptions): Promise<ScraperResult> {
  // 1. Resolver URL
  const resolvedUrl = await this.resolveUrl(url);

  // 2. Extrair IDs
  const ids = this.extractIds(resolvedUrl) || this.extractIds(url);

  // 3. Criar URL canônica
  const canonicalUrl = this.toCanonicalUrl(resolvedUrl) || this.toCanonicalUrl(url);

  // 4. Usar URL canônica para o browser/APIs
  const urlForBrowser = canonicalUrl || resolvedUrl;

  // 5. Lista de métodos (Iframely PRIMEIRO)
  const methods = [
    { name: "1. Iframely API", fn: () => this.tryIframelyApi(urlForBrowser, originalUrl, options) },
    // ... outros métodos como fallback
  ];

  // 6. Executar métodos em ordem
  for (const method of methods) {
    const result = await method.fn();
    if (result) {
      return { success: true, data: result };
    }
  }

  return { success: false, error: "Nenhum método funcionou" };
}
```

---

## Configuração do Ambiente (.env)

```env
# ═══════════════════════════════════════════════════════════════════════════════
# IFRAMELY API
# O que é: Serviço que extrai meta tags Open Graph de URLs
# Onde conseguir: https://iframely.com > Sign Up > Settings > API Key
# Gratuito: Sim (1000 requests/mês no plano free)
# OBRIGATÓRIO para scraping Shopee
# ═══════════════════════════════════════════════════════════════════════════════
IFRAMELY_API_KEY=sua_chave_aqui
```

---

## Testes

### Teste Manual do Método

```bash
cd apps/api
npx tsx test-iframely-all-images.ts
```

### Teste do Bot Completo

```bash
cd apps/api
npm run dev
```

Envie o link para o bot `@DivulgaFacilArtes_bot`:
```
https://s.shopee.com.br/4VWBoPbIzC
```

### Verificar Logs Esperados

```
[Iframely] Status: 200
[Iframely] Title: Misturinha Midas - (Oils Complex + Leave-In)...
[Iframely] Images: 2 (1 sem overlay)
[Iframely] Image URL: https://down-br.img.susercontent.com/file/br-11134...
[Iframely] Usando imagem limpa: SIM
[Iframely] Preço encontrado: R$ 49.95

[1. Iframely API] ✅ SUCESSO em 610ms
[1. Iframely API] Título: "Misturinha Midas - (Oils Complex + Leave-In)"
[1. Iframely API] Preço: R$ 49.95
[1. Iframely API] Imagem: https://down-br.img.susercontent.com/file/br-11134207-7r98o-ltplcayqpnahfd
```

---

## Dados Obtidos vs Limitações

| Campo | Disponível | Observação |
|-------|------------|------------|
| Título | ✅ SIM | Nome completo do produto |
| Preço | ✅ SIM | Preço MÍNIMO ("a partir de") |
| Imagem | ✅ SIM | Imagem LIMPA (sem overlay) após filtro |
| Marca/Vendedor | ✅ SIM | Nome da marca |
| Descrição | ✅ SIM | Descrição completa |
| Em Estoque | ✅ SIM | Disponibilidade |
| Preço Original | ❌ NÃO | Não disponível via OG tags |
| Desconto % | ❌ NÃO | Não disponível via OG tags |
| Preços por Variação | ❌ NÃO | Requer JavaScript (bloqueado) |

---

## Diagrama de Sequência

```
┌─────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌────────┐
│ Usuário │     │   Bot    │     │   Scraper    │     │ Iframely │     │ Shopee │
└────┬────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘     └────┬───┘
     │               │                  │                  │                │
     │ envia link    │                  │                  │                │
     │──────────────>│                  │                  │                │
     │               │                  │                  │                │
     │               │ scrape(url)      │                  │                │
     │               │─────────────────>│                  │                │
     │               │                  │                  │                │
     │               │                  │ resolveUrl()     │                │
     │               │                  │─────────────────────────────────->│
     │               │                  │<──────────────────(301 redirect)──│
     │               │                  │                  │                │
     │               │                  │ extractIds()     │                │
     │               │                  │ toCanonicalUrl() │                │
     │               │                  │                  │                │
     │               │                  │ GET /api/iframely│                │
     │               │                  │─────────────────>│                │
     │               │                  │                  │ GET og:meta    │
     │               │                  │                  │───────────────>│
     │               │                  │                  │<───────────────│
     │               │                  │<─────────────────│                │
     │               │                  │                  │                │
     │               │                  │ filterCleanImage()                │
     │               │                  │ (remove promo-dim)                │
     │               │                  │                  │                │
     │               │<─────────────────│                  │                │
     │               │ ProductData      │                  │                │
     │               │ (imagem limpa)   │                  │                │
     │               │                  │                  │                │
     │ gera arte     │                  │                  │                │
     │<──────────────│                  │                  │                │
```

---

## Checklist de Implementação

Ao reimplementar este método, verifique:

- [ ] `IFRAMELY_API_KEY` configurada no `.env`
- [ ] Método `resolveUrl` funcionando (seguir redirects)
- [ ] Método `extractIds` extraindo shopId e itemId
- [ ] Método `toCanonicalUrl` gerando URL no formato `/product/{shopId}/{itemId}`
- [ ] Método `tryIframelyApi` usando `urlForBrowser` (URL canônica)
- [ ] Filtro de imagem implementado: `images.filter(img => !img.includes("promo-dim"))`
- [ ] Iframely é o **primeiro** método na lista
- [ ] Logs mostrando "Usando imagem limpa: SIM"

---

## Diferenças entre Branch Main e Implementação Atual

### Análise da Branch Main (2026-01-11)

A branch `main` possui uma implementação mais simples que **NÃO** inclui:

| Característica | main | feat/shopee-antibot (atual) |
|----------------|------|----------------------------|
| Linhas de código | 1285 | 2703 |
| Método `tryIframelyApi` | ❌ NÃO existe | ✅ Linha 987-1098 |
| Método `toCanonicalUrl` | ❌ NÃO existe | ✅ Linha 2060-2076 |
| Método `isGenericShopeePreview` | ❌ NÃO existe | ✅ Linha 1999-2058 |
| Filtro de imagem limpa | ❌ NÃO existe | ✅ `!img.includes("promo-dim")` |
| Métodos de fallback | ~5 métodos | 37 métodos |

### O que Copiar para a Main

Quando retornar à branch main, você precisará:

#### 1. Adicionar Método `toCanonicalUrl` (15 linhas)

```typescript
private toCanonicalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("shopee")) return null;
    const path = parsed.pathname.replace(/\/+$/, "");

    const opaanlpMatch = path.match(/\/opaanlp\/(\d+)\/(\d+)/i);
    if (opaanlpMatch) return `https://shopee.com.br/product/${opaanlpMatch[1]}/${opaanlpMatch[2]}`;

    const dottedMatch = path.match(/i\.(\d+)\.(\d+)/);
    if (dottedMatch) return `https://shopee.com.br/product/${dottedMatch[1]}/${dottedMatch[2]}`;

    const slashMatch = path.match(/\/(\d+)\/(\d+)/);
    if (slashMatch) return `https://shopee.com.br/product/${slashMatch[1]}/${slashMatch[2]}`;
  } catch {}
  return null;
}
```

#### 2. Adicionar Método `isGenericShopeePreview` (60 linhas)

```typescript
private isGenericShopeePreview(title: string, imageUrl: string, url: string): boolean {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedImage = imageUrl.toLowerCase();

  console.log(`[isGenericShopeePreview] Verificando - título: "${normalizedTitle.substring(0, 50)}..." imagem: "${normalizedImage.substring(0, 60)}..."`);

  // Títulos genéricos conhecidos
  const genericTitlePatterns = [
    "shopee brasil",
    "ofertas incríveis",
    "melhores preços",
    "faça login",
    "comece suas compras",
    "login",
    "acesse sua conta",
    "entre na sua conta",
    "cadastre-se",
  ];

  // Se título é apenas números (ID do produto)
  if (/^\d{6,}$/.test(normalizedTitle)) {
    console.log("[isGenericShopeePreview] REJEITADO: título é apenas ID numérico");
    return true;
  }

  // Se título contém padrões genéricos
  for (const pattern of genericTitlePatterns) {
    if (normalizedTitle.includes(pattern)) {
      console.log(`[isGenericShopeePreview] REJEITADO: título contém "${pattern}"`);
      return true;
    }
  }

  // Imagens genéricas conhecidas (logos, assets, etc)
  const genericImagePatterns = [
    "logo",
    "icon",
    "/assets/",
    "deo.shopeemobile.com",
    "shopee-pcmall-live",
    "placeholder",
    "default",
  ];

  for (const pattern of genericImagePatterns) {
    if (normalizedImage.includes(pattern)) {
      console.log(`[isGenericShopeePreview] REJEITADO: imagem contém "${pattern}"`);
      return true;
    }
  }

  // Se imagem não contém susercontent.com (CDN de produtos)
  if (normalizedImage && !normalizedImage.includes("susercontent.com") && !normalizedImage.includes("cf.shopee")) {
    console.log("[isGenericShopeePreview] REJEITADO: imagem não é do CDN de produtos");
    return true;
  }

  console.log("[isGenericShopeePreview] APROVADO: não é preview genérico");
  return false;
}
```

#### 3. Adicionar Método `tryIframelyApi` (110 linhas)

Ver código completo na seção "Código Completo do Método tryIframelyApi" acima.

#### 4. Modificar Método `scrape` na Main

Na main, o método `scrape` não usa URL canônica. Precisa adicionar:

```typescript
// ANTES (main atual)
const canonicalUrl = ids
  ? `https://shopee.com.br/product/${ids.shopId}/${ids.itemId}`
  : resolvedUrl;

// DEPOIS (adicionar Iframely como primeiro método)
const canonicalUrl = this.toCanonicalUrl(resolvedUrl) || this.toCanonicalUrl(url)
  || (ids ? `https://shopee.com.br/product/${ids.shopId}/${ids.itemId}` : resolvedUrl);

// Tentar Iframely PRIMEIRO (adicionar logo após resolução de URL)
const iframelyResult = await this.tryIframelyApi(canonicalUrl, url, options);
if (iframelyResult) {
  return { success: true, data: iframelyResult };
}

// Se falhar, continuar com lógica existente...
```

#### 5. Adicionar Dependência (se não existir)

Verificar se `IFRAMELY_API_KEY` está no `.env`:

```env
IFRAMELY_API_KEY=sua_chave_aqui
```

### Locais de Inserção na Main

1. **`toCanonicalUrl`**: Após o método `extractIds` (linha ~305 na main)
2. **`isGenericShopeePreview`**: Após o método `toCanonicalUrl`
3. **`tryIframelyApi`**: Após os métodos auxiliares de extração

### Ordem de Execução Desejada

```
1. resolveUrl() → Resolver redirects
2. extractIds() → Obter shopId/itemId
3. toCanonicalUrl() → Gerar URL canônica
4. tryIframelyApi() → PRIMEIRO método (usa URL canônica)
5. (fallbacks existentes) → Se Iframely falhar
```

---

## Clarificação: Métodos na Main vs Branch Atual

### Métodos Existentes na Branch Main

A branch `main` **NÃO** possui OCR. Os métodos existentes são:

| Método | Descrição | Status |
|--------|-----------|--------|
| `fetchFromApi` | API direta da Shopee | Bloqueado por antibot |
| `fetchFromPublicApi` | API pública da Shopee | Bloqueado por antibot |
| `fetchFromSearchBySlug` | Busca produto por slug | Parcialmente funcional |
| `fetchPriceFromGoogleCse` | Google CSE para enriquecer preço | Fallback |
| `fetchPriceFromSerpApi` | SerpAPI para enriquecer preço | Fallback |
| `scrapeWithPlaywright` | Scraping com Playwright | Detectado por antibot |

### Método de OCR (Screenshot + OCR.Space)

O método de OCR existe **apenas na branch `feat/shopee-antibot`** (atual), não na main.
- Localização: Método 20 (`tryPlaywrightScreenshotOcr`)
- **NÃO será incluído** ao reimplementar na main porque:
  1. Não existe na main original
  2. É complexo e lento (~10-15 segundos)
  3. Requer Playwright (detectado por antibot)
  4. O Iframely já resolve o problema de forma mais eficiente (~400ms)

### Plano de Implementação na Main

Quando resetar para a branch main, a estrutura será:

```
┌─────────────────────────────────────────────────────────────────┐
│ ORDEM DE EXECUÇÃO                                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. tryIframelyApi()        ← NOVO (método principal/oficial)    │
│    ↓ (se falhar)                                                │
│ 2. fetchFromApi()          ← Existente na main (fallback)       │
│    ↓ (se falhar)                                                │
│ 3. fetchFromSearchBySlug() ← Existente na main (fallback)       │
│    ↓ (se falhar)                                                │
│ 4. Google CSE / SerpAPI    ← Existente na main (enriquece preço)│
└─────────────────────────────────────────────────────────────────┘
```

### Resultado Esperado

- **99% dos casos**: Iframely retorna dados corretos em ~400ms
- **1% dos casos**: Fallback para métodos existentes da main
- **OCR**: Não será utilizado (desnecessário com Iframely funcionando)

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-01-11 | Método Iframely + URL canônica validado |
| 2026-01-11 | Descoberta: filtrar imagens "promo-dim" para obter imagem limpa |
| 2026-01-11 | Documentação detalhada para reimplementação criada |
| 2026-01-11 | Análise de diferenças entre branch main e feat/shopee-antibot adicionada |
