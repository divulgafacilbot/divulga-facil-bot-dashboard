# PRD: Acessibilidade e Semântica

## Problemas Encontrados

### Semântica

1. **Hierarquia de Headings incorreta**
   - `app/admin/page.tsx`: Múltiplos `<h1>` na mesma página (linha 402, 431, 450, 498, 517, 570, 589, 637, 656, 705)
   - `app/admin/templates/page.tsx`: Uso incorreto de `<h5>` após `<h2>` (salto de níveis)
   - `app/dashboard/templates/page.tsx`: Mesmo problema de hierarquia com `<h5>` após `<h2>`
   - Várias páginas usam `<h1>` para títulos de seções que deveriam ser `<h2>` ou `<h3>`

2. **Landmarks ausentes ou incompletos**
   - `app/layout.tsx`: Falta `<main>` no layout raiz
   - `app/admin/layout.tsx`: Layout admin não tem `<main>` explícito, usa `<div>` para conteúdo principal
   - Falta `<header>` semântico nos layouts (usa componente AppHeader mas não é elemento `<header>`)
   - `<nav>` nos layouts não tem `aria-label` para distinção

3. **Skip Links ausentes**
   - Nenhuma página tem link "Pular para o conteúdo principal"

### Imagens
- **Todas as imagens têm `alt`** - Não foram encontradas imagens sem atributo alt

### Formulários

1. **Labels sem `htmlFor`**
   - Apenas 10 ocorrências de `htmlFor` para 82 `<label>` no projeto
   - `app/(auth)/login/page.tsx`: `<label>` sem `htmlFor`
   - `app/admin/support/page.tsx`: Labels sem associação
   - `app/dashboard/support/page.tsx`: Labels sem associação
   - `app/dashboard/pagina-publica/page.tsx`: 14 labels, maioria sem `htmlFor`
   - `app/dashboard/templates/page.tsx`: 21 labels, poucos com `htmlFor`

2. **Input component**
   - `components/forms/Input.tsx`: Falta `aria-invalid` quando há erro
   - Falta `aria-describedby` para mensagem de erro
   - Mensagem de erro não tem `role="alert"`

### Navegação por Teclado

1. **Div clicável sem keyboard support**
   - `components/admin/CreatePromoTokenModal.tsx`: Overlay com `onClick` mas sem `onKeyDown`

2. **Focus management em modais**
   - `CreatePromoTokenModal.tsx`: Não há focus trap nem retorno de foco
   - `RotateTokenDialog.tsx`: Não há focus trap nem retorno de foco

### ARIA

1. **Estados dinâmicos**
   - Apenas 1 ocorrência de `aria-expanded` no projeto (`PromoTokenCard.tsx`)
   - Nenhum `aria-selected` para tabs ou seleções
   - Apenas 1 `role="alert"` no projeto

2. **Live regions**
   - Apenas 1 ocorrência de `role="alert"`
   - Nenhum `aria-live` para atualizações dinâmicas

3. **Modais**
   - `CreatePromoTokenModal.tsx` e `RotateTokenDialog.tsx` têm `role="dialog"` e `aria-modal` mas faltam focus trap

### Cores e Contraste
- Não foram encontrados problemas críticos de `outline: none` sem alternativa

## Conformidade WCAG

- **Nível A**: ~70% critérios atendidos
- **Nível AA**: ~50% critérios atendidos

### Critérios não atendidos:
- 1.3.1 Info and Relationships (headings, labels)
- 2.1.1 Keyboard (divs clicáveis)
- 2.4.1 Bypass Blocks (skip links)
- 2.4.6 Headings and Labels (hierarquia)
- 4.1.2 Name, Role, Value (ARIA incompleto)

## Solução Proposta

### Prioridade Alta
1. Adicionar skip link ao layout raiz
2. Corrigir hierarquia de headings nas páginas principais
3. Adicionar `htmlFor` a todos os labels
4. Melhorar Input component com ARIA

### Prioridade Média
5. Adicionar `aria-label` às navegações
6. Adicionar focus trap aos modais
7. Adicionar live regions para feedback dinâmico

### Prioridade Baixa
8. Adicionar `<header>` e `<footer>` semânticos

## Impacto
- Componentes afetados: ~25
- Risco de acessibilidade: **ALTO**

---

# Task List

### T001 - Adicionar skip link ao layout raiz

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/layout.tsx`
- modificar: `apps/web/app/dashboard/layout.tsx`
- modificar: `apps/web/app/admin/layout.tsx`

**Descrição:**
Adicionar link "Pular para o conteúdo principal" que aparece apenas no foco, permitindo usuários de teclado pular navegação repetitiva.

**WCAG:** 2.4.1

**Critérios de Aceite:**
- [ ] Skip link visível apenas no foco
- [ ] Skip link leva ao conteúdo principal
- [ ] Funciona com screen reader

**Estimativa:** 0.5h

---

### T002 - Corrigir hierarquia de headings no admin/page.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/admin/page.tsx`

**Descrição:**
Corrigir múltiplos h1 para usar apenas um h1 principal e converter os demais para h2/h3 apropriados.

**WCAG:** 1.3.1, 2.4.6

**Critérios de Aceite:**
- [ ] Apenas um h1 por página
- [ ] Hierarquia lógica sem saltos

**Estimativa:** 0.5h

---

### T003 - Corrigir hierarquia de headings no admin/templates/page.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/admin/templates/page.tsx`

**Descrição:**
Corrigir uso de h5 após h2 (deve ser h3) e garantir hierarquia correta.

**WCAG:** 1.3.1, 2.4.6

**Critérios de Aceite:**
- [ ] Sem saltos de níveis de heading
- [ ] Hierarquia lógica

**Estimativa:** 0.5h

---

### T004 - Corrigir hierarquia de headings no dashboard/templates/page.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/dashboard/templates/page.tsx`

**Descrição:**
Corrigir uso de h5 após h2 (deve ser h3) e garantir hierarquia correta.

**WCAG:** 1.3.1, 2.4.6

**Critérios de Aceite:**
- [ ] Sem saltos de níveis de heading
- [ ] Hierarquia lógica

**Estimativa:** 0.5h

---

### T005 - Melhorar acessibilidade do componente Input

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/components/forms/Input.tsx`

**Descrição:**
Adicionar aria-invalid, aria-describedby para erros, e role="alert" na mensagem de erro.

**WCAG:** 1.3.1, 4.1.2

**Critérios de Aceite:**
- [ ] aria-invalid quando há erro
- [ ] aria-describedby apontando para mensagem de erro
- [ ] Mensagem de erro com role="alert"

**Estimativa:** 0.5h

---

### T006 - Adicionar aria-label às navegações

**Tipo:** PARALLEL-GROUP-2
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/dashboard/layout.tsx`
- modificar: `apps/web/app/admin/layout.tsx`

**Descrição:**
Adicionar aria-label descritivo às tags nav para distinguir navegações.

**WCAG:** 1.3.1, 4.1.2

**Critérios de Aceite:**
- [ ] Cada nav tem aria-label único
- [ ] Labels descritivos e em português

**Estimativa:** 0.25h

---

### T007 - Adicionar keyboard support ao overlay do modal

**Tipo:** PARALLEL-GROUP-2
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/components/admin/CreatePromoTokenModal.tsx`
- modificar: `apps/web/components/admin/RotateTokenDialog.tsx`

**Descrição:**
Adicionar suporte a tecla Escape para fechar modais e melhorar foco.

**WCAG:** 2.1.1, 2.1.2

**Critérios de Aceite:**
- [ ] Escape fecha o modal
- [ ] Foco inicial no modal quando abre

**Estimativa:** 0.5h

---

### T008 - Adicionar labels corretos aos formulários de auth

**Tipo:** PARALLEL-GROUP-3
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/(auth)/login/page.tsx`
- modificar: `apps/web/app/(auth)/register/page.tsx`
- modificar: `apps/web/app/(auth)/forgot-password/page.tsx`
- modificar: `apps/web/app/(auth)/reset-password/page.tsx`

**Descrição:**
Garantir que todos os inputs tenham labels com htmlFor correto.

**WCAG:** 1.3.1, 3.3.2

**Critérios de Aceite:**
- [ ] Todos inputs têm label associado
- [ ] htmlFor corresponde ao id do input

**Estimativa:** 0.5h

---

### T009 - Adicionar landmarks semânticos aos layouts

**Tipo:** SEQUENTIAL
**Dependências:** T001
**Arquivos:**
- modificar: `apps/web/app/layout.tsx`
- modificar: `apps/web/app/dashboard/layout.tsx`
- modificar: `apps/web/app/admin/layout.tsx`
- modificar: `apps/web/components/common/AppHeader.tsx`

**Descrição:**
Envolver AppHeader em `<header>` e adicionar `<main>` onde ausente.

**WCAG:** 1.3.1

**Critérios de Aceite:**
- [ ] Header semântico presente
- [ ] Main semântico em todos os layouts
- [ ] Landmarks detectáveis por screen readers

**Estimativa:** 0.5h

---

## Ordem de Execução

1. **T001 (SEQUENTIAL):** Skip links - base para navegação acessível
2. **T002, T003, T004 (PARALLEL-GROUP-1):** Corrigir headings em paralelo
3. **T005 (SEQUENTIAL):** Melhorar Input component
4. **T006, T007 (PARALLEL-GROUP-2):** ARIA e keyboard em paralelo
5. **T008 (PARALLEL-GROUP-3):** Labels nos formulários
6. **T009 (SEQUENTIAL):** Landmarks semânticos

---

## Status de Execução

- [x] T001 - Skip link
- [x] T002 - Headings admin/page.tsx
- [x] T003 - Headings admin/templates/page.tsx
- [x] T004 - Headings dashboard/templates/page.tsx
- [x] T005 - Input component ARIA
- [x] T006 - Nav aria-labels
- [x] T007 - Modal keyboard support
- [x] T008 - Auth form labels
- [x] T009 - Landmarks semânticos
