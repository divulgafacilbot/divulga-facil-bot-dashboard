# PRD: TypeScript e Validação

## Problemas Encontrados

### Tipagem

**Erros de compilação (3):**
1. `app/admin/support/page.tsx:199` - Comparação com 'resolved' que não existe no tipo SupportTicketStatus
2. `components/pinterest/PublicFilters.tsx:85,102` - hasFilters é `string | null` mas esperado `boolean`

**Uso de `any` (10 ocorrências):**
1. `app/[slug]/page.tsx:91,97,98` - cards.items.map com `any`
2. `components/admin/CreatePromoTokenModal.tsx:51,105,123,176` - `as any` para botType
3. `tests/e2e/helpers/*.ts` - múltiplos `any` (arquivos de teste)

### Configuração
- strict: true ✅
- strictNullChecks: implícito via strict ✅
- Paths: configurados ✅ (@/*)

### Organização de Tipos
- Pasta types/: ✅ presente
- Tipos centralizados: ✅ index.ts com re-exports
- Tipos de domínio: ✅ user.ts, card.ts, metrics.ts, api.ts
- Tipos de API: ✅ promo-token.types.ts

### Validação
- Schemas Zod: Parcialmente presentes (lib/api/types/)
- Server Actions: Não utilizadas (usa API routes)

## Solução Proposta

### Correções Necessárias

1. **Corrigir erro de tipo em support/page.tsx** - Remover comparação com 'resolved'
2. **Corrigir tipo boolean em PublicFilters.tsx** - Usar `!!` para converter para boolean
3. **Remover `as any` em CreatePromoTokenModal** - Usar tipo correto BotType

## Impacto
- Arquivos afetados: 3
- Type safety: MÉDIO

---

# Task List

### T001 - Corrigir erro de tipo em support/page.tsx

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/admin/support/page.tsx`

**Descrição:**
A linha 199 compara `selectedTicket.status` com 'resolved', mas SupportTicketStatus só tem: 'open', 'in_progress', 'closed', 'archived'. Substituir 'resolved' por 'closed'.

**Critérios de Aceite:**
- [ ] Sem erro TS2367
- [ ] tsc --noEmit passando

**Estimativa:** 0.1h

---

### T002 - Corrigir tipo boolean em PublicFilters.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/components/pinterest/PublicFilters.tsx`

**Descrição:**
Converter `hasFilters` para boolean explícito usando `!!` ou `Boolean()`.

**Critérios de Aceite:**
- [ ] Sem erro TS2322
- [ ] tsc --noEmit passando

**Estimativa:** 0.1h

---

### T003 - Remover `as any` em CreatePromoTokenModal

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/components/admin/CreatePromoTokenModal.tsx`

**Descrição:**
Usar tipo BotType importado de admin-enums ao invés de `as any`.

**Critérios de Aceite:**
- [ ] Sem uso de `as any`
- [ ] Tipagem correta com BotType
- [ ] tsc --noEmit passando

**Estimativa:** 0.2h

---

### T004 - Tipar cards em [slug]/page.tsx

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/[slug]/page.tsx`

**Descrição:**
Remover `: any` nos callbacks de map e usar tipagem correta do card.

**Critérios de Aceite:**
- [ ] Sem uso de `: any`
- [ ] Tipos inferidos ou explícitos
- [ ] tsc --noEmit passando

**Estimativa:** 0.2h

---

## Ordem de Execução

1. **T001 (SEQUENTIAL):** Corrigir support/page.tsx
2. **T002, T003 (PARALLEL-GROUP-1):** Corrigir PublicFilters e CreatePromoTokenModal
3. **T004 (SEQUENTIAL):** Tipar cards em [slug]/page.tsx

---

## Status de Execução

- [x] T001 - support/page.tsx
- [x] T002 - PublicFilters.tsx
- [x] T003 - CreatePromoTokenModal.tsx
- [x] T004 - [slug]/page.tsx
