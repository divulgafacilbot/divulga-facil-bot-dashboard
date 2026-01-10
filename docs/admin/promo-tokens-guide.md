# Guia do Administrador: Tokens Promocionais

## Visão Geral

Os tokens promocionais permitem que você distribua acesso temporário ou permanente aos bots sem exigir que os usuários tenham uma assinatura ativa. Isso é útil para:

- Campanhas promocionais de lançamento
- Testes beta com usuários selecionados
- Parcerias e distribuição de acessos especiais
- Demonstrações e avaliações gratuitas

---

## Acessando o Gerenciamento de Tokens

1. Faça login no painel administrativo
2. No menu lateral, clique em **"Tokens Promocionais"**
3. Você verá a lista de todos os tokens criados

**Nota:** Apenas administradores com a permissão `PROMO_TOKENS` podem acessar esta página.

---

## Criando um Token Promocional

### Passo a Passo

1. Clique no botão **"+ Criar Token"** no topo da página
2. Preencha o formulário:
   - **Tipo de Bot:** Selecione para qual bot o token será válido (Artes, Download, Pinterest ou Sugestões)
   - **Nome:** Dê um nome descritivo (ex: "Token Lançamento Q1 2026")
   - **Descrição (opcional):** Adicione detalhes sobre o propósito do token
   - **Data de Expiração (opcional):** Defina quando o token deixará de funcionar. Deixe em branco para token sem expiração
3. Clique em **"Criar Token"**
4. O token será gerado automaticamente com 64 caracteres seguros

### Boas Práticas para Criação de Tokens

- **Nomes Descritivos:** Use nomes que identifiquem facilmente o propósito (ex: "Promoção Black Friday 2026")
- **Defina Expiração:** Para campanhas limitadas, sempre defina uma data de expiração
- **Documente no Descrição:** Adicione informações como público-alvo, objetivo e data de criação

---

## Visualizando e Filtrando Tokens

### Filtros Disponíveis

- **Tipo de Bot:** Veja apenas tokens de um bot específico
- **Status:** Filtre por tokens ativos ou inativos

Para limpar todos os filtros, clique em **"Limpar Filtros"**.

### Informações Exibidas no Card do Token

Cada token exibe:
- Badge do tipo de bot (colorido por categoria)
- Nome e descrição
- String do token (oculta por padrão, clique no ícone do olho para revelar)
- Botão de copiar para área de transferência
- Data de expiração (com destaque se estiver próxima ou expirada)
- Data de criação
- Status (ativo/inativo)

---

## Copiando um Token

1. Localize o token que deseja compartilhar
2. Clique no botão **"📋 Copiar"** no card do token
3. Uma mensagem de confirmação aparecerá: "Token copiado com sucesso!"
4. Cole o token onde necessário (ex: mensagem para o usuário, documento de instruções)

**Segurança:** Trate os tokens como senhas. Não os compartilhe publicamente ou em locais não seguros.

---

## Rotacionando um Token

A rotação cria um novo token com as mesmas propriedades e desativa o antigo instantaneamente.

### Quando Rotacionar

- Token foi comprometido ou vazado
- Precisa renovar o acesso mantendo as mesmas configurações
- Quer invalidar distribuições antigas e criar novas

### Como Rotacionar

1. Clique no botão **"🔄 Rotacionar Token"** no card do token
2. Confirme a ação no diálogo: "Rotacionar este token criará um novo e invalidará o anterior. Continuar?"
3. O novo token será criado e exibido imediatamente
4. O token antigo será marcado como inativo e não funcionará mais

**Importante:** Esta ação é irreversível. O token antigo não pode ser reativado após a rotação.

---

## Deletando um Token

A exclusão marca o token como inativo permanentemente.

### Como Deletar

1. Clique no botão **"🗑️ Deletar"** no card do token
2. Confirme a ação no diálogo: "Tem certeza que deseja deletar este token? Esta ação não pode ser desfeita."
3. O token será desativado imediatamente

**Nota:** Tokens deletados permanecem no banco de dados para auditoria, mas são marcados como inativos e não funcionam mais.

---

## Distribuindo Tokens para Usuários

### Método Recomendado

1. Copie o token
2. Envie ao usuário através de canal seguro (email, mensagem privada)
3. Forneça instruções claras:
   ```
   Use este token para acessar o Bot de [Nome do Bot]:
   Token: [colar token aqui]

   Como usar:
   1. Abra o bot no Telegram
   2. Envie o comando /start
   3. Quando solicitado, cole o token acima
   4. Aproveite o acesso!

   Validade: [data de expiração ou "Sem expiração"]
   ```

### Rastreamento de Uso

Atualmente, o sistema registra validações de tokens em telemetria. Para ver o uso:
1. Acesse o painel de telemetria
2. Filtre por evento `TOKEN_VALIDATED`
3. Veja sucessos e falhas de validação

---

## Gerenciando Permissões

### Concedendo Acesso a Colaboradores

1. Acesse **"Permissões"** no menu lateral
2. Localize o colaborador
3. Marque a caixa **"Tokens Promocionais"**
4. Salve as alterações

O colaborador agora pode:
- Criar novos tokens
- Visualizar todos os tokens
- Rotacionar e deletar tokens
- Não pode modificar permissões de outros usuários

### Removendo Acesso

1. Acesse **"Permissões"**
2. Desmarque a caixa **"Tokens Promocionais"** do colaborador
3. Salve as alterações
4. Confirme a remoção no diálogo

---

## Métricas dos 4 Bots

O painel de visão geral agora exibe métricas consolidadas para os 4 tipos de bot:

- **Bot de Artes:** Bots ativos + Artes geradas (30 dias)
- **Bot de Download:** Bots ativos + Downloads realizados (30 dias)
- **Bot de Pinterest:** Bots ativos + Pins criados (30 dias)
- **Bot de Sugestões:** Bots ativos + Sugestões geradas (30 dias)

Todas as métricas respeitam a janela de agregação de 30 dias para consistência.

---

## Suporte e Filtragem por Bot

### Filtrando Tickets de Suporte

No painel de suporte, agora você pode filtrar tickets por tipo de bot:

1. Acesse **"Suporte"** no menu lateral
2. Use o filtro **"Tipo de Bot"** no topo da lista
3. Selecione o bot desejado ou "Todos os Bots"
4. A lista de tickets será atualizada automaticamente

Isso facilita a triagem e roteamento de tickets para especialistas de cada bot.

---

## Solução de Problemas

### Token não Funciona

**Possíveis causas:**
1. Token expirou - Verifique a data de expiração no card
2. Token foi deletado ou rotacionado - Crie um novo token
3. Token é para outro tipo de bot - Verifique se o botType está correto
4. Token está inativo - Verifique o status no card

**Solução:** Crie um novo token ou rotacione o existente (se ainda ativo).

### Colaborador não Vê "Tokens Promocionais" no Menu

**Causa:** Falta permissão `PROMO_TOKENS`.

**Solução:**
1. Acesse **"Permissões"**
2. Conceda a permissão ao colaborador
3. O colaborador deve fazer logout e login novamente

### Erro ao Criar Token

**Possíveis causas:**
1. Nome muito longo (máximo 100 caracteres)
2. Descrição muito longa (máximo 5000 caracteres)
3. Data de expiração no passado
4. Problema de conexão com o servidor

**Solução:** Verifique os limites de caracteres e tente novamente. Se persistir, contate o suporte técnico.

---

## Perguntas Frequentes

**P: Quantos tokens posso criar?**
R: Não há limite definido. Crie quantos precisar para suas campanhas.

**P: Um mesmo token pode ser usado por múltiplos usuários?**
R: Sim, um token pode ser compartilhado com vários usuários. Todos terão acesso enquanto o token estiver ativo e não expirado.

**P: Posso alterar o tipo de bot de um token após criá-lo?**
R: Não. Você precisa criar um novo token para outro tipo de bot.

**P: O que acontece se um usuário tentar usar um token expirado?**
R: O bot rejeitará o token e informará ao usuário que ele expirou.

**P: Posso reativar um token deletado?**
R: Não. Tokens deletados não podem ser reativados. Crie um novo token ou rotacione antes de deletar.

---

## Contato e Suporte

Para dúvidas ou problemas não cobertos neste guia:
- Abra um ticket no sistema de suporte interno
- Contate a equipe técnica via [canal de comunicação]
