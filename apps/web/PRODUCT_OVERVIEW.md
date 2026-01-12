# PRODUCT_OVERVIEW.md

Projeto: Sistema MULTIUSUÁRIO de bot para marketing de afiliados (SaaS)
Stack definida: Next.js + TypeScript + Tailwind + Node.js + PostgreSQL + Kiwify + Railway + Telegram Bot API (grammY) + axios + cheerio + Playwright
Objetivo deste documento: explicar o negócio e o funcionamento completo do produto em linguagem clara, mas extremamente detalhada, para orientar desenvolvimento, alinhamento com cliente e documentação interna.
Regra para Claude CLI e Codex CLI: qualquer implementação e qualquer tela/fluxo deve ser coerente com este documento e com o ARCHITECTURE.md.
Regra final de coerência: qualquer nova funcionalidade, ajuste ou refatoração deve respeitar este documento e o ARCHITECTURE.md. Se algo não estiver descrito nesses documentos, a funcionalidade é considerada incompleta.

======================================================================
1) O NEGÓCIO (O QUE ESTE PRODUTO É, E POR QUE ELE EXISTE)
======================================================================

Este produto é um serviço comercial (SaaS) criado para pessoas que trabalham com marketing de afiliados e precisam divulgar produtos todos os dias em diversas redes sociais e grupos. O problema prático desse público é o seguinte: a pessoa encontra um produto, pega o link de afiliado e precisa divulgar esse produto de forma atraente. Porém, divulgar bem exige tempo e trabalho manual: abrir a página, copiar nome, pegar imagem, conferir preço, montar uma arte bonita (feed e story), escrever uma legenda curta com emojis e chamada para ação, ajustar fonte, cores e identidade visual… e repetir isso várias vezes por dia.

Esse produto elimina esse trabalho repetitivo. Ele transforma o processo em um fluxo simples e rápido através de dois bots inicialmente:

- O usuário pode contratar apenas o Bot de Promoções, apenas o Bot de Download, ou um pacote promocional com os dois. Cada assinatura libera apenas os bots contratados.

O primeiro bot terá como função fazer o download de artes, vídeos e imagens de sites. 
Tendo o bot instalado:
- No dia a dia, ele só precisa colar links no Telegram.
- O bot entende o link, busca os dados automaticamente, identifica a arte, faz o download e salva na conversa. 
- O usuário pode então baixar no celular ou enviar para onde quiser.

O segundo bot terá como função criar as artes para divulgação dos links.
- Antes de usar este bot, é recomendado que o usuário configure no dashboard dele o padrão visual que irá querer usar nas artes (template, estilo, cores, fonte, se vai ter cupom, textos, etc). Quando configuradas estas escolhas, o modelo definido ficará como padrão até o momento que o usuário entrar novamente no site e fizer a alteração. Essa configuração inicial é importante, mas não é obrigatória, caso o usuário não faça esta configuração inicial, o padrão será um starter definido pela aplicação.
- No dia a dia, ele só precisa colar links no Telegram.
- O bot entende o link, busca os dados automaticamente e devolve:
  - 1 card para divulgação no telegram que terá uma arte e um texto, com o formato definido pelo usuário no template escolhido no dashboard.
  - 1 arte pronta para story, com o formato 9:16 e com o layout definido pelo usuário no dashboard.
  - 1 arte pronta e otimizada para WhatsApp, com formato 1:1 e com o layout definido pelo usuário no dashboard.

Ou seja: o usuário não precisa mais “produzir arte”. Ele passa a “gerar artes” em segundos a partir de links. É uma ferramenta extremamente valiosa para quem vive de divulgação.

Por ser multiusuário, esse sistema não é uma ferramenta pessoal. Ele é um produto vendável, pronto para ser oferecido a dezenas, centenas (e futuramente milhares) de usuários. Cada usuário tem seu próprio painel, suas próprias configurações visuais e sua própria vinculação com o bot no Telegram. O sistema controla acesso por assinatura e por bot, e bloqueia automaticamente se o plano expirar.

======================================================================
2) O DASHBOARD (O SISTEMA WEB) — COMO ELE FUNCIONA E TUDO QUE ELE TEM
======================================================================

O dashboard é o site onde o usuário entra para controlar tudo. Ele é simples de usar, mas completo por trás, porque carrega a parte essencial do produto: controle de conta, controle de plano, e personalização do padrão visual que vai ser usado para gerar as artes.

O dashboard é dividido em duas áreas principais:
- Área do Usuário
- Área do Administrador (apenas para o dono do sistema)

----------------------------------------------------------------------
2.1) Área do Usuário — Cadastro, Login, Segurança e Validação de Assinatura
----------------------------------------------------------------------

Esta área é responsável por identificar o usuário, garantir acesso seguro ao sistema
e validar se ele possui uma assinatura ativa vinculada corretamente à sua conta.

O sistema trabalha com dois conceitos separados:
- Identidade do usuário (login no SaaS)
- Direito de uso (pagamento/assinatura via Kiwify)

Esses dois pontos são conectados de forma segura pelo e-mail.

----------------------------------------------------------------------
1) Cadastro e Login (Identidade do Usuário)
----------------------------------------------------------------------

O usuário acessa o sistema por cadastro tradicional:
- O usuário informa e-mail e cria uma senha.
- O sistema valida se o e-mail já existe.
- A senha é armazenada de forma segura (hash, nunca em texto).
- Após o cadastro, o usuário já pode fazer login normalmente.
O e-mail é o identificador único do usuário.

----------------------------------------------------------------------
2) Sessão e Segurança
----------------------------------------------------------------------

- Após login bem-sucedido, o sistema cria uma sessão segura (token).
- O token é usado para acessar o dashboard e a API.
- Todas as ações sensíveis validam se o usuário está autenticado.
- Sessões expiram automaticamente por segurança.

----------------------------------------------------------------------
3) Recuperação de Senha
----------------------------------------------------------------------

Caso o usuário esqueça a senha:

- Ele clica em “Esqueci minha senha”.
- Informa o e-mail cadastrado.
- O sistema envia um e-mail com link e token temporário.
- O usuário define uma nova senha.
- O acesso é restabelecido normalmente.

Esse fluxo garante que o usuário nunca perca acesso ao serviço.

----------------------------------------------------------------------
4) Garantia de Conta Correta (Login + Pagamento)
----------------------------------------------------------------------

Para garantir que o acesso pago seja concedido à conta correta,
o sistema amarra **login e pagamento pelo e-mail**.

A regra é simples:

- E-mail do login  
  = e-mail cadastrado no sistema

- E-mail do pagamento (Kiwify)  
  = e-mail do comprador recebido via webhook

### Validação automática

- Se os e-mails coincidirem:
  ✅ Acesso liberado automaticamente

- Se os e-mails NÃO coincidirem:
  ❌ Acesso não é liberado automaticamente

Nesse caso, o sistema informa claramente ao usuário:

“Seu pagamento foi feito com outro e-mail.  
Clique aqui para vincular sua assinatura.”

----------------------------------------------------------------------
5) Vinculação de E-mails com Validação Antifraude (Código de 6 Dígitos)
----------------------------------------------------------------------

Em alguns casos, o e-mail usado no login do sistema pode ser diferente do e-mail utilizado no pagamento pela plataforma externa (ex: Kiwify).
Quando essa divergência acontece, o sistema NÃO libera acesso automaticamente.

Para garantir segurança e evitar qualquer tipo de fraude, é aplicado um fluxo de vinculação com validação por código temporário.

a) Fluxo de Vinculação Automática (com Código por E-mail)
Quando o sistema detecta divergência de e-mails:
- O usuário visualiza a mensagem:
“Detectamos que seu pagamento foi feito com outro e-mail. Para sua segurança, confirme a titularidade da assinatura.”
- O sistema solicita o E-mail usado no pagamento (Kiwify)
- Após a confirmação, o sistema:
  - Gera um código numérico de 6 dígitos, aleatório e temporário
  - Envia esse código exclusivamente para o e-mail do pagamento
- O usuário recebe o e-mail e informa o código no sistema.
- O sistema valida:
  - Se o código está correto
  - Se o código ainda está dentro do tempo de validade (ex: 10 minutos)
  - Se o código ainda não foi utilizado
- Com a validação positiva:
  - A assinatura é vinculada ao user_id
  - Os e-mails passam a ser considerados relacionados
  - O acesso às funcionalidades pagas é liberado imediatamente
- O código é invalidado após o uso.

Importante: somente quem tem acesso real ao e-mail do pagamento consegue concluir esse processo.

b) Suporte Manual (Fallback Controlado)
Caso o usuário não consiga concluir a validação automática (por exemplo, perdeu acesso ao e-mail antigo), o sistema oferece uma alternativa:
- Opção “Preciso de ajuda para vincular minha assinatura”
- O usuário abre um chamado informando:
  - Nome completo
  - E-mail de login
  - E-mail da compra
  - ID da compra ou assinatura (se disponível)
- O administrador:
  - Verifica os dados no painel da Kiwify
  - Confirma a titularidade da assinatura
  - Realiza a vinculação manualmente

Esse fluxo é usado apenas como exceção, garantindo escalabilidade sem sobrecarregar o suporte.

----------------------------------------------------------------------
Objetivo desta Área
----------------------------------------------------------------------

Este mecanismo de vinculação garante que:
- Apenas usuários autenticados consigam iniciar o processo
- Apenas usuários com assinatura ativa consigam liberar acesso
- A liberação aconteça somente para o verdadeiro titular da compra
- O sistema funcione de forma escalável, automática e segura
- O suporte humano seja acionado apenas em casos excepcionais

Esse modelo é o padrão recomendado para SaaS com pagamentos externos,
especialmente quando integrados a plataformas como a Kiwify, onde o pagamento ocorre fora do sistema principal.


----------------------------------------------------------------------
2.2) Área do Usuário — Status do Plano (Assinatura) e Acesso
----------------------------------------------------------------------

O dashboard precisa deixar totalmente claro para o usuário:
- se ele tem plano ativo
- qual plano ele contratou (mensal/anual)
- até quando ele tem acesso
- o que acontece se ele estiver sem plano

Esse produto usa Kiwify para pagamento. O pagamento pode ser feito em um blog externo (checkout). O usuário pode comprar em outro lugar, mas o dashboard é o local onde ele usa o serviço. Então o dashboard precisa “refletir” o status da assinatura.

Quando o usuário está com plano ativo:
- ele vê um “Plano ativo”
- vê a data de validade (expiração)
- consegue usar todas as funções

Quando o plano expira ou não existe:
- o dashboard avisa claramente que o plano não está ativo
- mostra um botão “Assinar / Renovar”
- este botão leva para o checkout no Kiwify

Esse controle é fundamental, porque é ele que garante que o serviço realmente é um produto vendável (só usa quem paga).

----------------------------------------------------------------------
2.2.1) Modelo de planos, limites e acesso por bot
----------------------------------------------------------------------

O sistema opera com planos pagos (mensal e anual), e cada plano define limites claros de uso. Esses limites são aplicados de forma automática tanto no dashboard quanto nos dois bots.

Cada plano possui, no mínimo, os seguintes parâmetros:

- max_artes_por_dia
- max_downloads_por_dia
- max_execucoes_simultaneas
- cooldown_entre_requisicoes (em segundos)
- acesso_bot_geracao (true/false)
- acesso_bot_download (true/false)

Esses limites são verificados:
- antes de iniciar qualquer scraping
- antes de gerar qualquer arte
- antes de iniciar qualquer download

Se o limite for atingido:
- o bot responde de forma clara:
  “Você atingiu o limite do seu plano hoje.”
- o bot envia junto o link do dashboard (/billing)
- o dashboard exibe o plano atual e sugestão de upgrade/renovação

Nenhuma execução pesada (scraping, renderização, download) ocorre
se o limite já foi atingido.

Além disso, o usuário só tem acesso aos bots incluídos na assinatura:
- Se o plano não inclui o bot, o bot responde com orientação de upgrade.
- O pacote promocional libera os dois bots.

----------------------------------------------------------------------
2.2.2) Links de assinatura, renovação e billing
----------------------------------------------------------------------

O sistema possui uma rota central de billing:

/dashboard/billing

Essa página:
- exibe plano atual
- exibe status (ativo/inativo/expirado)
- exibe data de expiração
- exibe botão “Assinar / Renovar”

O botão direciona para o checkout da Kiwify correspondente ao plano.

Os bots também podem enviar links de renovação quando:
- o plano expira
- o usuário tenta usar uma função bloqueada

Mensagem padrão do bot:
“Seu plano não está ativo. Para continuar, assine ou renove pelo link abaixo.”

O link enviado pelo bot sempre aponta para a página de billing do dashboard,
e nunca diretamente para a Kiwify, garantindo controle e rastreabilidade.

----------------------------------------------------------------------
2.3) Área do Usuário — Configuração Visual (Branding) para Artes
----------------------------------------------------------------------

Esta é uma das partes mais importantes do sistema, pois é onde o usuário define como as artes automáticas do bot irão ficar visualmente.

A proposta é simples e eficiente:
- O usuário configura o visual, esta configuração fica salva na memória até ser sobreescrita por uma nova pelo próprio usuário.
- Depois disso, toda vez que usar o bot, as artes serão geradas automaticamente seguindo exatamente esse padrão.

O dashboard possui uma sidebar com um botão "Definir template", onde o usuário pode personalizar os seguintes pontos:

1) Template (Modelo de Layout)
- O sistema disponibiliza modelos prontos de layout (ex: Template A, B, C).
- Cada template possui uma estrutura diferente, como:
  - posição do nome do produto
  - posição do preço
  - tamanho e enquadramento da imagem do produto (dentro de um permitido)
  - existência ou não de um cupom de desconto
  - organização dos elementos visuais

O usuário escolhe o template que mais combina com o estilo de divulgação dele.
Esses templates garantem padronização, rapidez e qualidade visual nas artes geradas automaticamente.

2) Cores

O usuário pode personalizar a paleta de cores das artes, definindo:
- Cor de fundo do card
- Cor do texto principal
- Cor do preço ou destaque
- Cor de elementos secundários (quando aplicável)

Isso permite que cada usuário tenha identidade visual própria, sem precisar editar imagens manualmente.

3) Cupom de Desconto

Botão toggle (ligar/desligar) de “Cupom de desconto” 
Campo para definir o texto do cupom (ex: CUPOM10, DESCONTO20)

Quando ativado:
- o cupom aparece automaticamente na arte
- o destaque segue o layout do template escolhido

5) Texto Padrão / CTA (Call to Action)

Campo opcional para definir um texto padrão de CTA

Exemplos:
- “Link na descrição”
- “Oferta por tempo limitado”
- “Aproveite enquanto durar”

Esse texto pode aparecer dentro da arte ou na legenda gerada automaticamente (caso tenha legenda bn template escolhido)

6) Botão “Editar no Canva” (Opcional)
Para usuários que desejam ajustes finais mais criativos, o sistema oferece o botão “Editar no Canva”

Funcionamento:
- O sistema gera a arte automaticamente
- Com um clique, a arte é aberta no Canva como base

O usuário pode:
- adicionar elementos
- fazer pequenos ajustes
- aplicar animações ou detalhes extras

Essa edição é manual e externa, pensada como um complemento opcional à automação.

7) Upload de Arte Personalizada

Para importar a arte alterada no canva e também para quem prefere criar sua própria arte:
- O usuário pode fazer upload de uma imagem personalizada
- Essa imagem passa a ser usada como base padrão para as divulgações

O bot continua inserindo automaticamente e de acordo com o layout configurado:
- nome do produto
- preço
- cupom?
- CTA?

Isso oferece máxima flexibilidade sem perder a automação.

O isolamento por usuário é muito importante.

Todas as configurações são:
- salvas individualmente
- isoladas por usuário

O sistema nunca mistura dados:
- Usuário A vê apenas suas configurações
- Usuário B tem outro padrão totalmente independente

Resultado Prático para o Usuário
- O serviço “tem a cara dele”
- As artes ficam consistentes visualmente
- Não há necessidade de editar manualmente toda vez
- A divulgação fica mais rápida e profissional
- A identidade visual fortalece a marca pessoal

Isso aumenta a taxa de conversão

----------------------------------------------------------------------
2.4) Área do Usuário — Conectar Telegram (vincular conta ao bot)
----------------------------------------------------------------------

Como os bots são multiusuário, o sistema precisa saber “quem é quem” no Telegram. É nessa tela que o usuário conecta sua conta aos bots.

O dashboard terá uma seção tipo “Conectar Telegram” com botões:

- “Gerar token de conexão do Bot de Promoções”
- “Gerar token de conexão do Bot de Download”

Quando o usuário clica:
- O sistema gera um token temporário (válido por alguns minutos).
- O dashboard mostra instruções simples:
  1) Abra o Telegram
  2) Entre no bot escolhido (apenas os bots incluídos no plano aparecem)
  3) Envie: /start SEU_TOKEN

Quando o usuário faz isso:
- O bot escolhido registra o Telegram daquele usuário.
- A partir daí, sempre que o usuário enviar um link, o bot sabe que aquele Telegram pertence àquele usuário e aplica as configurações certas.

Sem esse passo, o bot responde dizendo “conecte sua conta”.

Vínculo único por usuário:
- Um único telegram_user_id é vinculado a um único user_id
- Os dois bots consultam a mesma tabela de vínculo
- Se o admin desvincular um Telegram, o acesso aos dois bots é bloqueado

Apesar do vínculo ser único, a liberação é feita por bot:
- Cada bot exige seu próprio token de conexão
- Isso permite que o usuário tenha apenas um bot, se preferir

----------------------------------------------------------------------
2.5) Área do Usuário — Como o usuário usa no dia a dia (fluxo simples)
----------------------------------------------------------------------

Depois que o usuário:
- pagou o plano
- configurou o branding (se aplicável ao Bot de Promoções)
- conectou o Telegram no(s) bot(s) contratado(s)

O uso diário fica absurdamente simples:

No primeiro bot:
- Ele encontra um produto em uma loja e pega o link de afiliado
- Ele cola o link no chat com o bot
- Ele recebe 3 artes prontas
- Ele salva e publica onde quiser

No segundo bot:
- Ele encontra um vídeo ou imagem bom para o produto
- Ele cola o link no chat com o bot
- O bot entregar a imagem ou vídeo na conversa
- Ele salva ou compartilha onde quiser

O dashboard, nesse ponto, vira só um “painel de controle” para ajustes. O usuário vive no Telegram, e o bots entregam o valor.

======================================================================
3) O BOT 1 — BOT DE MARKETPLACES (GERAR ARTES A PARTIR DE LINKS)
======================================================================

Este é o núcleo do produto. É o bot que transforma link de produto em artes prontas.

O bot funciona assim:

1) O usuário envia um link de produto (Shopee/Mercado Livre/Amazon/Magalu)
2) O bot reconhece de qual marketplace é o link
3) O bot acessa a página do produto
4) O bot extrai:
   - nome COMPLETO do produto (não abreviar)
   - imagem principal
   - preço
5) O bot carrega as configurações do usuário (cores, fonte, cupom, template)
6) O bot gera as artes em 3 formatos:
   - Card de divulgação
   - Story
   - WhatsApp
7) O bot envia essas 3 imagens para o usuário no Telegram

----------------------------------------------------------------------
3.1) Reconhecimento automático do link
----------------------------------------------------------------------

O usuário não escolhe loja manualmente. Basta colar o link.
O sistema identifica pelo domínio e estrutura, por exemplo:
- shopee.com.br/...
- mercadolivre.com.br/...
- amazon.com.br/...
- magazineluiza.com.br/...

Isso torna a experiência “mágica”: o usuário só cola e recebe tudo pronto.

----------------------------------------------------------------------
3.2) Extração de informações do produto
----------------------------------------------------------------------

Cada marketplace tem estrutura própria. O sistema terá conectores específicos por marketplace.

O objetivo do scraping é trazer:
- Título completo: sem cortar palavras
- Preço: texto e (se possível) valor numérico
- Imagem: URL principal (a melhor imagem)

Se scraping simples falhar (bloqueio ou página dinâmica), entra Playwright como fallback.

----------------------------------------------------------------------
3.3) Geração das artes (renderização)
----------------------------------------------------------------------

A geração das imagens é um processo fundamental para garantir qualidade:

- O sistema monta um HTML do template com Tailwind, incluindo:
  - foto do produto
  - título completo
  - preço
  - cupom (se ativo)
  - identidade visual do usuário (cores/fonte)

- Depois o Playwright renderiza esse HTML como se fosse uma página e tira screenshots em tamanhos fixos.

Isso gera imagens consistentes e bonitas, sem depender de editores manuais.

----------------------------------------------------------------------
3.4) Envio no Telegram
----------------------------------------------------------------------

Depois de gerar as imagens, o bot envia:
- 3 arquivos/imagens no chat
- dois deles com uma mensagem curta tipo:
  “Aqui estão suas artes prontas para story e WhatsApp.”
- o terceiro é enviado em forma de um card para ser compartilhado no telegram, o default será imagem+texto. Na legendairá constar o nome completo do produto, o preço e o link de afiliado. Esse formato poderá ser alterado no feed pelo usuário. 

O usuário então:
- salva no celular
- compartilha no telegram
- publica manualmente onde quiser

O sistema NÃO posta automaticamente em redes do usuário (isso exige integrações e permissões complexas). O valor do produto é gerar tudo pronto.

======================================================================
4) O BOT 2 — BOT DE DOWNLOAD DE CONTEÚDO POR LINK
======================================================================

Esse é o segundo bot, com objetivo de capturar artes boas daquele produto que estão sendo divulgadas por outros usuários e sites. Ele serve para quando o usuário cola um link de uma rede social e quer baixar o conteúdo multimidia dele.

O problema que ele resolve é:
- afiliados vivem salvando posts/reels/vídeos para reaproveitar
- baixar isso manualmente é chato, exige site de terceiros, dá trabalho, tem anúncios, etc.

O bot automatiza isso:
- usuário cola link
- bot devolve o arquivo multimidia direto no Telegram

----------------------------------------------------------------------
4.1) Plataformas suportadas
----------------------------------------------------------------------

- Instagram: post ou reel público
- TikTok: público
- Pinterest: público

Importante:
- não suporta conteúdo privado
- não suporta stories
- não suporta conteúdo que exija login

Isso deve ficar claro no produto para evitar expectativas irreais. Estas limitações não são de "programação", são limitações legais que impedirão o bot de ser bloqueado.

----------------------------------------------------------------------
4.2) Como o bot encontra o arquivo real
----------------------------------------------------------------------

O link que o usuário cola não é o link “direto” do vídeo ou imagem. Normalmente é uma página HTML.
O sistema precisa “descobrir” a URL direta do arquivo (cdn).

Ele faz isso por:
- leitura do HTML e metadados (og:video / og:image)
- leitura de JSON embutido na página
- quando necessário, Playwright (abre como navegador real e extrai o que foi carregado)

O resultado dessa etapa é uma URL direta para o arquivo.

----------------------------------------------------------------------
4.3) Download e entrega
----------------------------------------------------------------------

Depois de encontrar a URL direta:
- o sistema baixa o arquivo por stream (sem travar)
- guarda temporariamente
- envia para o Telegram com:
  - sendPhoto (imagem)
  - sendVideo (vídeo)
  - ou sendDocument (quando necessário)

O usuário recebe a mídia na conversa e salva no celular com 1 clique. (Ou compartilha se preferir).

======================================================================
5) DIFERENÇA ENTRE OS DOIS BOTS (IMPORTANTE PARA O PRODUTO)
======================================================================

Bot A: “Gerar artes de produto”
- Entrada: link de marketplace
- Saída: 3 artes prontas (feed, story, WhatsApp)

Bot B: “Baixar mídia”
- Entrada: link de Instagram/TikTok/Pinterest
- Saída: arquivo original (imagem/vídeo) baixado

O sistema detecta automaticamente as informações pelo domínio do link.
O usuário não precisa selecionar nada.

======================================================================
6) COMO O SISTEMA CONTROLA QUEM PODE USAR (MULTIUSUÁRIO + PAGAMENTO)
======================================================================

Esse é o coração comercial do SaaS.

O sistema só libera acesso se:
- o usuário está vinculado ao Telegram
- a assinatura está ativa (status ACTIVE e data de expiração no futuro)
- o plano contratado inclui o bot que está sendo usado

Se o usuário não pagou ou expirou:
- o bot responde: “Seu plano expirou. Assine para continuar.” e apresenta o link do dashboard/billings
- e o dashboard mostra: “Plano inativo” com link de assinatura

Esse controle é aplicado tanto no modo de gerar artes quanto no modo de download.
Se o usuário não tiver acesso a um dos bots por plano, esse bot bloqueia o uso e orienta para upgrade.

======================================================================
7) EXPERIÊNCIA DO USUÁRIO FINAL (O QUE ELE SENTE)
======================================================================

O usuário sente que tem uma “máquina de criar divulgação”:

- Ele não perde tempo criando design
- Ele só cola link e recebe tudo pronto
- Ele mantém padrão visual consistente
- Ele consegue baixar conteúdos de redes sociais sem ferramentas externas

Isso dá velocidade e aumenta produtividade, que é o que esse público quer.

======================================================================
8) PAINEL ADMIN (VISÃO DO DONO DO NEGÓCIO)
======================================================================

O Painel Administrativo é a área exclusiva do dono do sistema (ou equipe interna),
responsável por garantir que o SaaS funcione corretamente do ponto de vista técnico,
comercial e operacional.

Ele não é apenas um “listador de usuários”, mas sim um centro de controle do negócio,
permitindo acompanhar crescimento, faturamento, uso da plataforma, problemas e suporte.

O acesso ao Painel Admin é restrito por permissão (role ADMIN),
e não pode ser acessado por usuários comuns.

----------------------------------------------------------------------
8.1) Home do Admin (Visão Geral do Negócio)
----------------------------------------------------------------------

A tela inicial do Painel Admin funciona como um “dashboard executivo”.

Ela apresenta indicadores claros e rápidos sobre a saúde do negócio, como:

- Total de usuários cadastrados
- Usuários ativos (assinatura válida)
- Usuários inativos / expirados
- Novos usuários nos últimos 7 / 30 dias
- Faturamento estimado (mensal / anual)
- Assinaturas ativas por plano (mensal x anual)
- Quantidade total de artes geradas
- Quantidade total de downloads realizados
- Uso médio por usuário
- Falhas de scraping
- Eventos críticos recentes

Esses dados são apresentados através de:
- cards numéricos
- gráficos simples (linha e barras)
- comparativos de crescimento

Objetivo desta tela:
- permitir que o dono bata o olho e entenda se o negócio está crescendo
- identificar quedas de uso ou faturamento rapidamente
- acompanhar se usuários realmente estão usando o produto

----------------------------------------------------------------------
8.2) Gestão de Usuários
----------------------------------------------------------------------

Esta aba permite administrar todos os usuários da plataforma.

Funcionalidades principais:

- Lista completa de usuários com:
  - nome (se existir)
  - e-mail principal (login)
  - e-mail vinculado ao pagamento (Kiwify)
  - status da assinatura (ACTIVE / EXPIRED / NONE)
  - data de expiração do plano
  - data de cadastro
  - data do último acesso
  - Telegram vinculado (sim/não)

- Filtros:
  - usuários ativos
  - usuários expirados
  - usuários sem assinatura
  - usuários com problema de vinculação
  - usuários bloqueados

- Ações administrativas:
  - bloquear usuário (impede acesso aos bots e dashboard)
  - desbloquear usuário
  - forçar expiração de plano (casos extremos)
  - estender acesso manualmente (ex: cortesia)
  - desvincular / revincular Telegram
  - vincular assinatura manualmente (casos de suporte)

Objetivo desta aba:
- controle total da base de usuários
- capacidade de agir rapidamente em casos problemáticos
- evitar fraudes ou uso indevido

----------------------------------------------------------------------
8.3) Gestão de Assinaturas e Pagamentos (Kiwify)
----------------------------------------------------------------------

Esta aba é focada em pagamento e integração com a Kiwify.

Funcionalidades:

- Visualizar eventos recebidos via webhook da Kiwify:
  - nova assinatura
  - renovação
  - cancelamento
  - pagamento recusado
  - expiração

- Para cada evento:
  - ID da compra
  - e-mail do comprador
  - plano contratado
  - status
  - data
  - usuário vinculado (ou não)

- Identificar rapidamente:
  - pagamentos não vinculados
  - pagamentos com e-mail diferente do login
  - falhas de webhook

- Ações administrativas:
  - vincular manualmente um pagamento a um usuário
  - reenviar processamento de um webhook
  - marcar pagamento como inválido (fraude/teste)

Objetivo desta aba:
- garantir que o dinheiro recebido esteja corretamente refletido no sistema
- evitar usuários reclamando de “paguei e não liberou”

----------------------------------------------------------------------
8.4) Gestão de Templates (Modelos de Artes)
----------------------------------------------------------------------

Esta é uma aba estratégica para o produto.

Aqui o administrador controla os templates padrão que os usuários utilizam
para gerar artes automaticamente.

Funcionalidades:

- Criar novos templates:
  - nome do template
  - descrição
  - estrutura do layout (HTML base)
  - posições permitidas:
    - imagem do produto
    - título
    - preço
    - cupom
    - CTA

- Editar templates existentes:
  - ajustes visuais
  - melhorias de layout
  - correções de bugs
  - adaptação a novos formatos

- Definir templates como:
  - “Template padrão do sistema”
  - “Template premium” (se futuramente houver diferenciação por plano)

- Definir quais campos são editáveis pelo usuário
- Versionar templates

- Ativar / desativar templates:
  - desativados não aparecem para novos usuários
  - usuários antigos podem ser migrados se necessário

Objetivo desta aba:
- evoluir o produto visualmente sem depender de código toda hora
- manter qualidade estética das artes
- permitir crescimento futuro do catálogo de templates

----------------------------------------------------------------------
8.5) Monitoramento de Uso (Bots e Processamento)
----------------------------------------------------------------------

Esta aba mostra como o sistema está sendo usado na prática.

Indicadores disponíveis:

- Quantidade de links processados por dia
- Quantidade de artes geradas por bot
- Quantidade de downloads realizados
- Uso médio por usuário
- Usuários com uso excessivo (possível abuso)
- Consumo por usuário
- Alertas de abuso
- Tentativas bloqueadas por limite

Separação clara por bot:
- Bot de geração de artes (marketplaces)
- Bot de download de mídias (Instagram/TikTok/Pinterest)

Objetivo desta aba:
- entender carga do sistema
- prever necessidade de escala
- identificar padrões de uso ou abuso
- tomar decisões técnicas (fila, cache, limites)

----------------------------------------------------------------------
8.6) Central de Chamados / Suporte
----------------------------------------------------------------------

Esta aba centraliza todos os chamados abertos pelos usuários.

Tipos de chamados comuns:
- problema de vinculação de e-mail
- pagamento não reconhecido
- erro no bot
- dúvida de uso
- pedido de ajuste manual

Funcionalidades:

- Lista de chamados com:
  - usuário
  - tipo
  - status (aberto / em andamento / resolvido)
  - categoria do problema
  - data de abertura

- Visualização do histórico do usuário:
  - plano
  - pagamentos
  - uso
  - Telegram vinculado
  - eventos relacionados

- Ações:
  - responder chamado
  - resolver e fechar
  - realizar ação administrativa direta (ex: vincular pagamento)

Objetivo desta aba:
- reduzir caos no suporte
- centralizar problemas reais
- permitir atendimento rápido e organizado

Regra operacional:
- O suporte existe apenas como fallback.
- Fluxos automáticos sempre têm prioridade (validação por código, checagem de webhook, checagem de status de plano).
- Chamados manuais só são usados quando o usuário não tem mais acesso ao e-mail de pagamento, há falha comprovada de webhook ou existe disputa legítima.

----------------------------------------------------------------------
8.7) Logs e Auditoria
----------------------------------------------------------------------

Esta aba é técnica, mas extremamente importante.

Ela registra eventos críticos do sistema, como:
- falhas de scraping
- erros de geração de imagem
- erros de envio no Telegram
- falhas de webhook
- tentativas de acesso bloqueadas
- trilha de ações administrativas

Esses logs ajudam a:
- debugar problemas
- entender incidentes
- evitar perda de usuários
- melhorar estabilidade do sistema

Telemetria obrigatória:
- Eventos mínimos: USER_LOGIN, USER_LOGOUT, TELEGRAM_LINKED, TELEGRAM_UNLINKED, ART_JOB_STARTED, ART_JOB_SUCCESS, ART_JOB_FAILED, DOWNLOAD_JOB_STARTED, DOWNLOAD_JOB_SUCCESS, DOWNLOAD_JOB_FAILED, SCRAPE_FALLBACK_PLAYWRIGHT, SCRAPE_BLOCKED, PLAN_EXPIRED, PLAN_RENEWED, KIWIFY_WEBHOOK_RECEIVED, KIWIFY_WEBHOOK_FAILED, EMAIL_LINK_CODE_SENT, EMAIL_LINK_CODE_VALIDATED, EMAIL_LINK_CODE_FAILED.
- Cada evento registra event_id, user_id (quando aplicável), telegram_user_id (quando aplicável), timestamp, origem (dashboard, bot_1, bot_2, webhook) e metadata (JSON).
- Os dados agregados alimentam o painel admin; logs detalhados permanecem na infraestrutura (Railway).

----------------------------------------------------------------------
Objetivo Geral do Painel Admin
----------------------------------------------------------------------

O Painel Admin existe para que o dono do SaaS consiga:

- operar o negócio com segurança
- entender crescimento e faturamento
- resolver problemas sem mexer em código
- evoluir o produto com base em dados reais
- escalar com controle

Ele transforma o sistema de “um bot” em um SaaS de verdade.


======================================================================
9) LIMITES E REALIDADE (PARA EVITAR PROBLEMA FUTURO)
======================================================================

- O sistema depende de scraping. Marketplaces e redes sociais podem e vão mudar.
- Sempre que mudar o sistema precisará de atualizações pontuais.
- O MVP suporta apenas conteúdo público em redes sociais.
- O sistema é escalável. Mas. se crescer muito, pode exigir fila ou contratação de hospedagens com mais memória, etc.

O MVP pode operar sem fila dedicada, mas a arquitetura já prevê:
- jobs isolados por usuário
- possibilidade futura de fila (ex: Redis/BullMQ)
- limitação de concorrência por usuário
- fallback automático de scraping (axios → cheerio → playwright)

Caso o volume cresça:
- a fila será introduzida sem mudança de lógica
- apenas na camada de execução dos jobs

======================================================================
10) RESUMO FINAL (EM UMA FRASE)
======================================================================

Este produto é um SaaS multiusuário que transforma links em divulgação pronta: o usuário contrata o bot desejado (ou o pacote com os dois), personaliza a identidade visual quando aplicável, cola links no Telegram e recebe artes prontas para postar ou baixa conteúdos de redes sociais diretamente pelo bot.
