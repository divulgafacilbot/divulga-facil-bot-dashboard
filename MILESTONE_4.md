# MILESTONE_4_SOFTWARE_ARCHITECTURE.md

Milestone: 4 — Bot de Artes (Telegram) + leitura de links de marketplace
Objetivo: Implementação técnica completa do Bot de Artes integrado ao sistema.
Pre-requisitos: Milestone 1-3 concluida parcialmente (ver carryover abaixo).
Nota: Para configurações externas (BotFather, Railway, etc), ver MILESTONE_4_OUT.md

======================================================================
0) CARRYOVER DA MILESTONE 3 (PENDENTE)
======================================================================

- Backend de configuracao visual (brand-config):
  - GET /me/brand-config
  - PUT /me/brand-config
  - Validacao (Zod) e regras de acesso por usuario
  - Defaults quando usuario nao configurou
- Persistencia completa dos campos de branding:
  - templateId
  - bgColor
  - textColor
  - priceColor (se aplicavel)
  - fontFamily
  - showCoupon
  - couponText
  - ctaText (opcional)
  - customImageUrl (opcional)
- Testes (TDD):
  - Unitarios para validacao de payload
  - Integracao GET/PUT /me/brand-config e isolamento por usuario
- Backend de geracao do card (movido para esta milestone por dependencia do bot)

======================================================================
1) ESCOPO EXATO DA MILESTONE 4
======================================================================

1.1 O que esta milestone ENTREGA

- Entregas pendentes da Milestone 3 (ver secao 0)
- Bot de Artes no Telegram (grammY)
- Fluxo de vinculo por token especifico do Bot de Artes
- Identificacao multiusuario (telegramUserId -> userId)
- Scraping de marketplaces:
  - Shopee
  - Mercado Livre
  - Amazon
  - Magazine Luiza
- Extracao de dados do produto:
  - titulo completo
  - preco
  - imagem principal
- Resposta funcional no Telegram (texto/preview)

1.2 O que NAO entra nesta milestone

- Geracao de imagens (Milestone 5)
- Pagamentos/planos (Milestone 6)
- Bot de Download (Milestone 7)
- Painel admin

======================================================================
2) ENDPOINTS
======================================================================

Branding
- GET /me/brand-config
- PUT /me/brand-config

Telegram
- POST /telegram/link-token (body: botType = 'ARTS')
- POST /telegram/confirm-link (chamado pelo bot)

Regras:
- Token expira (ex: 10 min)
- Um userId por telegramUserId
- Registro adicional em telegram_bot_links

======================================================================
3) BANCO DE DADOS
======================================================================

Tabela telegram_links
- userId (unique)
- telegramUserId (unique)
- telegramChatId
- linkedAt

Tabela telegram_bot_links
- userId
- botType ('ARTS'|'DOWNLOAD')
- linkedAt

======================================================================
4) SCRAPING MARKETPLACES
======================================================================

Conectores em:
apps/api/src/services/scraping/marketplaces/
- shopee.ts
- mercadolivre.ts
- amazon.ts
- magalu.ts

Interface:
- canHandle(url)
- scrape(url) -> ProductData

ProductData:
- source
- url
- title
- priceText
- priceValue (opcional)
- imageUrl

Estrategia:
- axios + cheerio
- fallback Playwright

======================================================================
5) COMPORTAMENTO DO BOT
======================================================================

Fluxo:
1) Recebe mensagem
2) Valida vinculo
3) Detecta marketplace
4) Executa scraping
5) Retorna dados do produto

Mensagens:
- Sem vinculo: "Conecte sua conta pelo dashboard"
- Link invalido: "Link nao reconhecido"
- Erro de scraping: "Nao consegui capturar, tente novamente"

======================================================================
6) TESTES (TDD)
======================================================================

Unitarios
- validacao de payload de configuracao (brand-config)
- validacao de URL e classificacao de marketplace

Integracao
- /me/brand-config GET/PUT (persistencia e isolamento por usuario)
- /telegram/link-token cria token valido
- /telegram/confirm-link registra vinculo
- scraping retorna ProductData valido

======================================================================
7) CRITERIOS DE ACEITE
======================================================================

- Branding salvo e recuperado por usuario (com defaults quando vazio)
- Vinculo obrigatorio para uso do bot
- Scraping funcional em todos os marketplaces suportados
- Titulo completo do produto sem abreviacao
- Resposta clara em erros

======================================================================
9) PLANO OTIMIZADO DE ENTREGA
======================================================================

Fase 1 — Fechar pendencias da Milestone 3
- Implementar GET/PUT /me/brand-config com validacao
- Persistir configuracoes e defaults
- Testes basicos de integracao

Fase 2 — Bot + Vinculo
- Endpoints de link-token e confirm-link
- Registro em telegram_bot_links / telegram_links

Fase 3 — Scraping
- Conectores por marketplace
- Resposta do bot com dados extraidos

======================================================================
8) ESTRUTURA DE ARQUIVOS
======================================================================

apps/api/src/
- routes/telegram.routes.ts (endpoints de vinculação)
- routes/brand-config.routes.ts (GET/PUT /me/brand-config)
- services/scraping/marketplaces/
  - shopee.ts
  - mercadolivre.ts
  - amazon.ts
  - magalu.ts
  - index.ts (factory/registry)
- services/telegram/
  - arts-bot.ts (bot grammY)
  - link-service.ts (lógica de vinculação)
- validators/
  - brand-config.schema.ts (Zod)
  - telegram.schema.ts (Zod)
- tests/
  - brand-config.test.ts
  - telegram-link.test.ts
  - scraping.test.ts

======================================================================
9) NOTAS DE IMPLEMENTAÇÃO
======================================================================

- Usar grammY para bot do Telegram (biblioteca oficial)
- Validação com Zod em todos os endpoints
- Scraping: tentar axios+cheerio primeiro, fallback Playwright se necessário
- Token de vinculação expira em 10 minutos (configurável)
- Um telegramUserId pode estar vinculado a apenas um userId
- Defaults de brand-config definidos no código (não no banco)
- Testes com Jest (unitários) e Supertest (integração)

======================================================================
10) VARIÁVEIS DE AMBIENTE (Referência)
======================================================================

As variáveis necessárias estão documentadas em MILESTONE_4_OUT.md
Para implementação no código, usar process.env com validação:
- TELEGRAM_BOT_ARTS_TOKEN
- DATABASE_URL
- PLAYWRIGHT_BROWSERS_PATH (opcional)

======================================================================
11) SEPARAÇÃO DE RESPONSABILIDADES
======================================================================

Este arquivo (MILESTONE_4.md):
- Arquitetura de código
- Endpoints e rotas
- Schema de banco de dados
- Lógica de scraping
- Implementação do bot
- Testes automatizados
- Tudo que pode ser feito via Claude CLI

Arquivo MILESTONE_4_OUT.md:
- Criação do bot no BotFather
- Configuração de variáveis no Railway
- Deploy e provisionamento
- Testes manuais no Telegram
- Troubleshooting de infraestrutura
- Tudo que precisa ser feito manualmente fora do código
