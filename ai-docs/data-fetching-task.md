# PRD: Otimização de Data Fetching

## Problemas Encontrados

### 1. Waterfall em Múltiplas Páginas

**Problema:** Chamadas fetch sequenciais no useEffect quando poderiam ser paralelas.

| Arquivo | Problema |
|---------|----------|
| `app/admin/campaigns/page.tsx` | `fetchCampaigns()` e `fetchStats()` chamados sequencialmente |
| `app/dashboard/pagina-publica/page.tsx` | `fetchSettings()` e `fetchCards()` chamados sequencialmente |
| `app/dashboard/page.tsx` | 4 funções chamadas sequencialmente (já usa Promise.all internamente em uma) |
| `app/dashboard/templates/page.tsx` | 3 useEffects fazem fetch separados que poderiam ser paralelos |

### 2. Falta de Paralelização com Promise.all

**Páginas que se beneficiariam de Promise.all:**
- `app/admin/campaigns/page.tsx:35-38` - fetchCampaigns + fetchStats
- `app/dashboard/pagina-publica/page.tsx:77-80` - fetchSettings + fetchCards
- `app/dashboard/page.tsx:124-127` - 4 loads separados
- `app/dashboard/templates/page.tsx` - 3 loads em useEffects separados

### 3. Uso Correto de ISR (OK)

**Já implementado corretamente:**
- `app/[slug]/page.tsx:23` - `next: { revalidate: 60 }`
- `app/[slug]/[cardSlug]/page.tsx:24` - `next: { revalidate: 60 }`
- `lib/api/public-page.ts:221,240` - `next: { revalidate: 60 }`

### 4. Client-Side Fetch em Páginas Admin/Dashboard

**Contexto:** Este projeto usa Client Components para áreas autenticadas (admin/dashboard) porque:
- Requerem autenticação via token no cliente
- São páginas interativas que precisam de estado
- Não podem ser SSR porque os dados dependem do usuário logado

**Conclusão:** O uso de `'use client'` + useEffect + fetch é **apropriado** para estas páginas.

### 5. Não Há Uso de revalidatePath/revalidateTag

**Problema:** Após mutations (create/update/delete), os dados são refetchados manualmente com `fetchCampaigns()` etc, mas não há invalidação de cache server-side.

**Impacto:** Baixo - como o projeto usa Client Components para admin/dashboard, a invalidação client-side é suficiente.

## Solução Proposta

### Prioridade Alta - Eliminar Waterfalls

1. **Promise.all em useEffect** - Agrupar chamadas fetch paralelas
2. **Consolidar useEffects** - Mover múltiplos useEffects para um único

### Prioridade Média

3. Manter padrão ISR para páginas públicas (já OK)

### Baixa Prioridade / Não Necessário

4. revalidatePath/revalidateTag - Não aplicável pois admin/dashboard são Client Components

## Impacto
- Performance: **MÉDIO** (eliminar waterfalls melhora tempo de carregamento)
- Arquivos afetados: 4
- Risco: BAIXO

---

# Task List

### T001 - Paralelizar fetches em admin/campaigns/page.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/admin/campaigns/page.tsx`

**Descrição:**
Substituir chamadas sequenciais `fetchCampaigns(); fetchStats();` por Promise.all.

**Critérios de Aceite:**
- [ ] Usar Promise.all para fetches paralelos
- [ ] Manter tratamento de erro individual
- [ ] Loading state correto

**Estimativa:** 0.2h

---

### T002 - Paralelizar fetches em dashboard/pagina-publica/page.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/dashboard/pagina-publica/page.tsx`

**Descrição:**
Substituir chamadas sequenciais `fetchSettings(); fetchCards();` por Promise.all.

**Critérios de Aceite:**
- [ ] Usar Promise.all para fetches paralelos
- [ ] Manter tratamento de erro individual

**Estimativa:** 0.2h

---

### T003 - Paralelizar fetches em dashboard/page.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/dashboard/page.tsx`

**Descrição:**
Usar Promise.all para as 4 funções de load: loadMetrics, loadTokenCounts, loadPublicPageMetrics, loadPublicPageSlug.

**Critérios de Aceite:**
- [ ] Todas as 4 funções executadas em paralelo
- [ ] Tratamento de erro individual mantido

**Estimativa:** 0.2h

---

### T004 - Consolidar useEffects em dashboard/templates/page.tsx

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/dashboard/templates/page.tsx`

**Descrição:**
Consolidar os 3 useEffects que fazem fetch (loadCustomTemplates, loadLayoutPreferences, loadBrandConfig) em um único useEffect com Promise.all.

**Critérios de Aceite:**
- [ ] Um único useEffect para carregar dados iniciais
- [ ] Promise.all para fetches paralelos
- [ ] Dependências corretas do useEffect

**Estimativa:** 0.3h

---

## Ordem de Execução

1. **T001, T002, T003 (PARALLEL-GROUP-1):** Paralelizar fetches simples
2. **T004 (SEQUENTIAL):** Consolidar useEffects mais complexo

---

## Status de Execução

- [x] T001 - admin/campaigns/page.tsx
- [x] T002 - dashboard/pagina-publica/page.tsx
- [x] T003 - dashboard/page.tsx
- [x] T004 - dashboard/templates/page.tsx
