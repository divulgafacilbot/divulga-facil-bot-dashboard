# SUPER_PROMPT.md
# EXECUÇÃO TOTAL — SEM PERGUNTAS, SEM PULAR ETAPAS

You are Codex CLI executing tasks inside this repository.

This is a LONG, COMPLEX and CRITICAL task.
You MUST execute everything end-to-end.
You are NOT allowed to ask questions or request confirmations.

────────────────────────────────────────
GLOBAL EXECUTION RULES (HARD)
────────────────────────────────────────

1) DO NOT ask me anything during execution.
2) DO NOT request permissions.
3) DO NOT skip steps.
4) DO NOT summarize instead of executing.
5) DO NOT partially implement anything.
6) DO NOT stop on errors — fix them.
7) DO NOT refactor randomly — refactor only when required to fulfill the tasks.
8) The ONLY moment you are allowed to ask me something is explicitly defined at LINE 83 of this file. Anywhere else = forbidden.
9) If something is missing, broken, ambiguous, or incomplete:
   - make a safe, standard, production-ready decision
   - document the decision in the execution log
10) Every requirement written in this file MUST be implemented.

────────────────────────────────────────
REPOSITORY CONTEXT
────────────────────────────────────────

Relevant folders and files:

- apps/api
  - Telegram bot backend
  - Scraping
  - Image generation
- apps/web
  - Dashboard
  - Section "Editar Templates"
- bots-concorrentes/
  - Reference implementations (scraping, flows, ideas)
- LINKS_VALIDOS_AFILIADOS.md (ROOT)
  - OFFICIAL SOURCE OF VALID AFFILIATE LINKS
- MILESTONE_4.md
  - Product contract

────────────────────────────────────────
CRITICAL SOURCE OF TRUTH — LINKS_VALIDOS_AFILIADOS.md
────────────────────────────────────────

The file LINKS_VALIDOS_AFILIADOS.md contains EXACTLY:

- 3 valid Shopee affiliate links
- 3 valid Mercado Livre affiliate links
- 3 valid Amazon affiliate links
- 3 valid Magalu affiliate links

TOTAL: 12 VALID LINKS

ABSOLUTE RULES:
- ALL these links MUST work.
- NONE of these links can be rejected as invalid.
- Marketplace detection MUST correctly classify each one.
- Scraping MUST support these formats.
- These links MUST be used as:
  - Validation reference
  - Scraping tests
  - Debug baseline
  - Fallback logic

Any logic that breaks these links is WRONG and MUST be fixed.

────────────────────────────────────────
MAIN OBJECTIVE
────────────────────────────────────────

You are improving the Telegram Art Generation Bot described in MILESTONE_4.md.

The bot already exists partially but requires:

- Full code review
- Missing implementations
- TypeScript fixes
- Frontend + Backend + Bot alignment
- Stable scraping
- Image generation correctness
- UX improvements
- Counters
- Token-based access
- Componentized scraping architecture

You must guarantee the FULL FLOW works exactly as described below.

────────────────────────────────────────
PHASE 1 — WEBSITE TEMPLATE CONFIGURATION
────────────────────────────────────────

Objective: The client configures a base layout that becomes the DEFAULT for their account.

Required Frontend IDs (MANDATORY):
- imagem-de-fundo
- preview-do-card
- preview-do-story
- informacoes-do-card
- informacoes-do-story
- tamanho-imagem-produto-card
- tamanho-imagem-produto-story
- cupom-de-desconto-card
- cupom-de-desconto-story
- meu-texto-personalizado-feed
- save-layout-btn

TASKS:

1. Client opens the dashboard and accesses "Editar Templates".
2. Client selects a background image inside div id="imagem-de-fundo".
3. This selection automatically becomes active until changed.
4. Each background has TWO templates:
   - Card/Feed/Telegram
   - Instagram Story
5. The selected background renders:
   - Card preview inside id="preview-do-card"
   - Story preview inside id="preview-do-story"
6. Previews use mock-data.ts (always a watch product).
7. Client selects which fields appear:
   - Card legend → via checkboxes in id="informacoes-do-card"
   - Story image → via checkboxes in id="informacoes-do-story"
8. Card renders text in the LEGEND.
9. Story renders text INSIDE the image.
10. When satisfied, client clicks button id="save-layout-btn".
11. This configuration becomes the DEFAULT for the account.

All previews MUST update in real-time.

────────────────────────────────────────
PHASE 2 — TELEGRAM BOT LOGIN & TOKENS
────────────────────────────────────────

Objective: Allow controlled access to the Telegram bot.

TOKEN RULES (TEMPORARY, HARDCODED):
- Each client can generate exactly 2 tokens.
- Each token unlocks ONE Telegram account.
- This will become paid later — for now keep "2" hardcoded.

TASKS:

1. Implement token generation triggered by button id="btn-gerar-token-de-artes".
2. Token must:
   - Be copied automatically
   - Trigger toast "Token copiado com sucesso"
3. Render tokens inside div id="token-para-liberar-bot-de-artes" as rows:
   a) Label "Token {1}" / "Token {2}"
   b) Token ID
   c) Eye icon (toggle ****** / real token)
   d) Green copy icon + toast
   e) Red delete icon + toast "ID deletado com sucesso"
4. Implement backend endpoints:
   - Create token
   - List tokens
   - Delete token
5. Implement counters:
   - <p id="contador-de-bots-de-artes-ativos">
6. Add buttons inside div id="conectar-telegram":
   - "Acessar o bot de Artes" → t.me/DivulgaFacilArtes_bot
   - "Acessar o bot de Download" → toast "Este bot ficará pronto em breve"

Telegram Bot Flow:
1. User opens bot
2. /start
3. Bot requests token
4. User pastes token
5. Backend validates token
6. Bot unlocks usage
7. Active bot increments counter

────────────────────────────────────────
PHASE 3 — LINK INPUT VIA TELEGRAM
────────────────────────────────────────

Objective: Client sends affiliate link to generate art.

Rules:
- Accepted marketplaces:
  - Shopee
  - Amazon
  - Mercado Livre
  - Magalu
- ALL links in LINKS_VALIDOS_AFILIADOS.md MUST work.

Invalid link → clear error message.

────────────────────────────────────────
PHASE 4 — BACKEND PROCESSING & SCRAPING
────────────────────────────────────────

ABSOLUTE RULE:
productUrl MUST ALWAYS be the URL pasted by the user in Telegram.
NEVER replace it with scraped or redirected URLs.

DATA GROUPS:

A) Input:
- productUrl

B) Scraping (conditional):
- title
- description
- price
- originalPrice
- discountPercentage
- imageUrl (ALWAYS REQUIRED)
- marketplace
- rating
- reviewCount
- salesQuantity
- seller
- inStock

C) Fixed (from frontend):
- coupon
- disclaimer
- customText

SCRAPING LOGIC:
- Determine which fields are needed based on saved layout.
- Scrape ONLY what is required.
- imageUrl is ALWAYS required.
- Use LINKS_VALIDOS_AFILIADOS.md links as validation baseline.

────────────────────────────────────────
SCRAPING ARCHITECTURE — MANDATORY (NEW)
────────────────────────────────────────

You MUST REFACTOR / IMPLEMENT scraping as COMPONENTIZED modules.

REQUIRED STRUCTURE (example):

apps/api/src/scraping/
├── index.ts                # Router / dispatcher
├── types.ts                # Shared interfaces
├── baseScraper.ts          # Abstract base / shared helpers
├── shopee.scraper.ts
├── amazon.scraper.ts
├── mercadolivre.scraper.ts
├── magalu.scraper.ts

RULES:
1. Each marketplace MUST have its own scraper file.
2. No marketplace-specific logic is allowed outside its file.
3. index.ts selects the scraper based on marketplace enum.
4. Future fixes must affect ONLY the specific scraper file.
5. All scrapers MUST support the 3 official links per platform.
6. Scrapers MUST handle:
   - short links
   - redirects
   - fallback
7. If scraping fails:
   - log
   - retry
   - fallback without crashing the bot

────────────────────────────────────────
PHASE 4.2 — IMAGE GENERATION
────────────────────────────────────────

Generate TWO images:

A) Card / Feed / Telegram
- Size: 1080x1350 (4:5)
- Background: selected in frontend
- Product image positioned according to preview
- Send WITH legend

Legend format:
- Order defined by user in informacoes-do-card
- Uses:
  - scraped fields
  - fixed fields
  - productUrl

B) Story
- Size: 1080x1820 (~9:15)
- Background: selected in frontend
- Product image positioned according to preview
- Text rendered INSIDE image
- NO legend

────────────────────────────────────────
PHASE 5 — POST PROCESSING
────────────────────────────────────────

After successful generation:
- Increment <p id="contador-de-artes-geradas">

────────────────────────────────────────
MANDATORY FIXES & IMPLEMENTATIONS
────────────────────────────────────────

1. Fix TypeScript errors in:
   - apps/web/app/dashboard/templates/page.tsx
2. Introduce ENUMS:
   - MarketplaceEnum
   - RenderFieldEnum
3. Fix productUrl source (Telegram input only).
4. Implement counters:
   - Active bots
   - Generated arts
5. Convert:
   - cupom-de-desconto-card
   - cupom-de-desconto-story
   into text inputs identical to meu-texto-personalizado-feed.
6. Implement REORDERING for informacoes-do-card:
   - Drag & drop
   - Visual collapse
   - LocalStorage persistence
7. Implement SAME reordering for informacoes-do-story.
8. Ensure save-layout-btn sends ordered data.
9. Implement EVERYTHING described in this file.
10. Detect missing but REQUIRED implementations and REPORT them.

────────────────────────────────────────
LINE 83 — THE ONLY ALLOWED QUESTION POINT
────────────────────────────────────────

If, and ONLY if, you identify REQUIRED implementations that were NOT explicitly requested,
STOP and ask me to authorize them.

Anywhere else = forbidden.

────────────────────────────────────────
FINAL OUTPUT
────────────────────────────────────────

At the end, provide:
- Execution log
- Files created/changed
- Summary of deliveries
- List of suggested extra implementations (if any)

END OF SUPER_PROMPT.md
