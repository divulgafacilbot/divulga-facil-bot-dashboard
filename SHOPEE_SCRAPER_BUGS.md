
  ### Resumo do fluxo atual do bot com link do Telegram

  O usuário envia um link de produto (por exemplo, Shopee) para o bot no Telegram.
  A partir disso, o backend faz o seguinte caminho:

  1. Recebe o link no bot
      - O bot (Telegram) captura a mensagem com o link.
      - Ele passa esse link para o backend de scraping.
  2. Detecta o marketplace
      - O backend usa o ScraperRouter (em apps/api/src/scraping/index.ts) para identificar de qual marketplace é o link.
      - Para links da Shopee, o ShopeeScraper é selecionado automaticamente.
  3. Executa o scraping
      - O ShopeeScraper tenta resolver a URL (normaliza o link).
      - Em seguida, tenta obter o HTML e extrair:
          - título/nome do produto
          - imagem principal
          - preço
      - Se a extração funcionar, retorna um objeto ProductData com esses dados.
  4. Retorno para o bot
      - O backend devolve o resultado para o bot.
      - O bot usa esses dados para montar a resposta (texto, imagem, etc.) no Telegram.

  ### O que o bot deveria fazer

  - Quando o usuário envia um link válido:
      - o bot deveria responder com o nome do produto, preço e imagem.
      - idealmente também incluir outras informações (rating, desconto), se disponíveis.
  - Quando o scraping falha:
      - o bot informa que não foi possível acessar o produto (ex.: login exigido).

  ### Estrutura geral do código

  - Entrada: link vindo do Telegram.
  - Roteamento: ScraperRouter decide qual scraper usar (Shopee, Mercado Livre, Amazon, Magalu).
  - Scraper específico: o scraper do marketplace tenta extrair os dados.
  - Saída: objeto ProductData que é usado para responder o usuário no bot.
  
  Arquivo do scraper apps/api/src/scraping/shopee.scraper.ts

  ### Links da shopee para testar
  - https://s.shopee.com.br/2B8H26gBzF
  - https://s.shopee.com.br/4VWBoPbIzC
  - https://s.shopee.com.br/10wJe0A9hM
  
  ### ------------------------------------------------------------------------------------------------------------

  ###  PROBLEMA:

    Estamos enfrentando bloqueio anti‑bot da Shopee no backend. A intenção era pegar nome, imagem e preço de um produto a partir de um link e responder no bot do Telegram. No navegador o
  produto abre normalmente, mas no backend a Shopee devolve outro HTML.

  ### O que foi observado

  - O HTML retornado para o backend vem com título “Faça Login e comece suas Compras | Shopee Brasil” mesmo quando a URL é de produto.
  - Isso indica que a Shopee identifica o acesso como bot e devolve página de login no lugar do conteúdo real.
  - Sem esse HTML real, a extração de preço e dados não ocorre.

  ### Tentativas que falharam

  1. HTML direto (axios + cheerio)
      - Responde com página de login.
      - Não contém preço nem os dados do produto.
  2. Scrapfly com render_js
      - Retornou HTTP 200, mas o conteúdo ainda era a página de login.
      - Logs mostraram title de login e ausência de dados do produto.
      - Não foi possível extrair preço.
  3. Bright Data Web Unlocker
      - Primeiro retornou erro de “Premium domains” (Shopee exige isso).
      - Após ativar Premium Domains:
          - tivemos timeouts iniciais;
          - depois, o retorno veio como page_block:
              - status_code: 502
              - x-brd-error: Page block detected
              - body vazio
      - Ou seja, mesmo com Premium habilitado, o Unlocker não conseguiu desbloquear.
  4. Playwright
      - Também retorna página de login quando a Shopee bloqueia.
      - Não há dados para extrair.

  ### Resultado final

  - O scraper não consegue acessar o HTML real do produto.
  - Todas as tentativas resultaram em HTML de login ou bloqueio.
  - Não foi possível extrair nome, preço e imagem via backend.

  ### ------------------------------------------------------------------------------------------------------------

  ### Possíveis coisas que possam ser feitas:

  1) Resolver itemid/shopid via slug + Search API

  - Ideia: não bater na página; extrair slug e achar o item via API de busca.
  - Como funciona
          1. Parsear o slug do link (ex.: produto-bonito-i.123.456).
          2. Chamar endpoint de busca com o slug como query.
          3. Encontrar o item com maior similaridade e pegar shopid/itemid.
          4. Com shopid/itemid, chamar endpoint de item detail (API interna/mobile).
  - Prós: evita HTML; muito menos bloqueio.
  - Contras: pode errar o item se o slug for genérico; depende de endpoints estáveis.
  
  2) Resolver itemid/shopid via endpoint de “lookup”

  - Para links que não vêm no formato i.<shopid>.<itemid>, dá para:
      - Resolver redirecionamentos e capturar o slug final.
      - Usar um endpoint de “search by URL” (existem endpoints internos que recebem URL e retornam ids).
  - Mesmo que esse lookup falhe, ainda dá para tentar parsear ?spm= ou ?xptdk= quando presentes.

  3) Puxar dados via “share API” (dados do app)

  - A Shopee usa endpoints do app mobile que muitas vezes respondem sem login.
  - Exemplo de abordagem: User-Agent mobile + headers simples para api/v4 ou api/v2.
  - Diferente de Playwright: não precisa renderizar e geralmente não cai na página de login.

  4) Solução híbrida: obter dados via “cliente real”

  - Se o bot está bloqueado, dá para coletar no front (dashboard web) e enviar o resultado ao backend.
  - O usuário cola o link no painel web (browser real), o frontend faz fetch e passa JSON para o backend.
  - É um fluxo diferente, mas evita o bloqueio do backend (não é bot traffic).

  5) Programa de afiliados / API oficial

  - Em vez de scraping, usar API de afiliado da Shopee (quando disponível).
  - Vantagem: estabilidade e dados completos; evita bloqueio.
  - Desvantagem: precisa de credenciais e aprovação.

  6) Repensar: responder “parcial” com metadados

  - Alguns links têm metadados OpenGraph (og:title, og:image).
  - Mesmo que preço não venha, você já retorna nome/imagem e alerta que preço está indisponível.

  7) Cache colaborativo (warm cache)

  - Ideia: todo resultado válido vira cache; o bot primeiro consulta cache antes de tentar scraping.
  - Como funciona
          1. Quando alguém consegue obter dados (via front/browser real), salva ProductData.
          2. O bot consulta cache por URL ou shopid/itemid.
  - Prós: corta custo e bloqueio com o tempo.
  - Contras: precisa de volume de uso para aquecer.

  8) Preview de plataforma intermediária

  - Ideia: obter dados via serviços que já geram “link preview” (Slack/Discord/Telegram/Share API de terceiros).
  - Como funciona
          1. Enviar a URL para um serviço que retorna card JSON (title, image, price quando existe).
          2. Parsear esse card e retornar ao bot.
  - Prós: bypass de bloqueio direto da Shopee.
  - Contras: dependência externa; preço nem sempre vem; pode violar termos dependendo do provedor.