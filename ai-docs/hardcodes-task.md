# PRD: Centralização de Hardcodes

## Problema

O projeto possui uma excelente estrutura de constantes centralizadas em `lib/constants/` e `lib/admin-enums.ts`, porém:

1. **ROUTES não está sendo usado** - Existem ~50+ rotas hardcoded nos arquivos
2. **Status hardcoded** - Comparações diretas com strings de status em vez de usar as constantes
3. **COPY não está sendo usado** - Textos de UI definidos inline

## Escopo

### Já Centralizado (OK)
- `lib/constants/routes.ts` - Rotas definidas
- `lib/constants/status.ts` - Status de bots, cards, tickets
- `lib/constants/copy.ts` - Textos de UI
- `lib/admin-enums.ts` - Labels e tipos administrativos
- `lib/constants.ts` - BOT_NAME, BOT_TYPES

### Hardcodes Encontrados

| Categoria | Quantidade | Arquivos |
|-----------|-----------|----------|
| Rotas hardcoded (não usando ROUTES) | ~40 | 8 arquivos |
| Status comparações diretas | ~10 | 3 arquivos |
| Magic numbers (limit, timeout) | ~5 | 2 arquivos de produção |

### Arquivos com Hardcodes

**Rotas:**
- `app/admin/layout.tsx` - 6 rotas hardcoded
- `app/dashboard/layout.tsx` - 5 rotas hardcoded
- `app/dashboard/page.tsx` - 3 rotas hardcoded
- `components/dashboard/DashboardShell.tsx` - 4 rotas hardcoded
- `components/common/AppHeader.tsx` - 2 rotas hardcoded
- `app/(auth)/*.tsx` - 10+ rotas hardcoded

**Status:**
- `app/admin/support/page.tsx` - comparações com 'open', 'in_progress', 'closed'
- `app/dashboard/support/page.tsx` - comparações com 'closed'
- `app/admin/finance/page.tsx` - comparações com 'pending', 'refunded'

**Pagination/Limits:**
- `app/(dashboard)/suggestions/page.tsx:26` - `limit: 12`
- `app/(dashboard)/marketplace/products/page.tsx:26` - `limit: 12`

## Solução Proposta

### 1. Adicionar constante de paginação

```typescript
// lib/constants/pagination.ts
export const PAGINATION = {
  DEFAULT_LIMIT: 12,
  DEFAULT_PAGE: 1,
} as const;
```

### 2. Substituir rotas hardcoded por ROUTES

Usar `ROUTES.dashboard.bots` em vez de `'/dashboard/bots'`

### 3. Usar constantes de status para comparações

Usar `SUPPORT_TICKET_STATUS_LABELS.open` em vez de `'open'`

## Impacto
- Arquivos afetados: ~12
- Hardcodes a centralizar: ~55
- Risco: BAIXO (substituições simples)

---

# Task List

### T001 - Criar constante de paginação

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- criar: `apps/web/lib/constants/pagination.ts`
- modificar: `apps/web/lib/constants/index.ts`

**Descrição:**
Criar arquivo de constantes para limites de paginação.

**Critérios de Aceite:**
- [x] Arquivo criado com DEFAULT_LIMIT
- [x] Export adicionado ao index.ts

**Estimativa:** 0.1h

---

### T002 - Substituir rotas em app/admin/layout.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/admin/layout.tsx`

**Descrição:**
Substituir todas as rotas hardcoded por ROUTES.admin.*

**Critérios de Aceite:**
- [x] Importar ROUTES de @/lib/constants
- [x] Substituir '/admin/login' por ROUTES.admin.login
- [x] Substituir '/admin/users' por ROUTES.admin.users
- [x] etc.

**Estimativa:** 0.3h

---

### T003 - Substituir rotas em app/dashboard/layout.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/dashboard/layout.tsx`

**Descrição:**
Substituir todas as rotas hardcoded por ROUTES.dashboard.*

**Critérios de Aceite:**
- [x] Importar ROUTES de @/lib/constants
- [x] Substituir todas as rotas dashboard

**Estimativa:** 0.3h

---

### T004 - Substituir rotas em components/dashboard/DashboardShell.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/components/dashboard/DashboardShell.tsx`

**Descrição:**
Substituir rotas hardcoded do menu lateral.

**Critérios de Aceite:**
- [x] Importar ROUTES
- [x] Usar constantes para todas as rotas

**Estimativa:** 0.2h

---

### T005 - Substituir rotas em app/dashboard/page.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/dashboard/page.tsx`

**Descrição:**
Substituir rotas hardcoded.

**Critérios de Aceite:**
- [x] Usar ROUTES.dashboard.*

**Estimativa:** 0.1h

---

### T006 - Substituir rotas em components/common/AppHeader.tsx

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/components/common/AppHeader.tsx`

**Descrição:**
Substituir rotas de auth hardcoded.

**Critérios de Aceite:**
- [x] Usar ROUTES.auth.*

**Estimativa:** 0.1h

---

### T007 - Substituir rotas em páginas de auth

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/(auth)/login/page.tsx`
- modificar: `apps/web/app/(auth)/register/page.tsx`
- modificar: `apps/web/app/(auth)/forgot-password/page.tsx`
- modificar: `apps/web/app/(auth)/reset-password/page.tsx`
- modificar: `apps/web/app/(auth)/verify-email/page.tsx`

**Descrição:**
Substituir todas as rotas de navegação entre páginas de auth.

**Critérios de Aceite:**
- [x] Todas as rotas usando ROUTES.auth.*

**Estimativa:** 0.3h

---

### T008 - Usar constantes de status em support/page.tsx

**Tipo:** PARALLEL-GROUP-2
**Dependências:** none
**Arquivos:**
- modificar: `apps/web/app/admin/support/page.tsx`
- modificar: `apps/web/app/dashboard/support/page.tsx`

**Descrição:**
Substituir comparações diretas de status por constantes.

**Critérios de Aceite:**
- [x] Usar keys de SUPPORT_TICKET_STATUS_LABELS para comparações

**Estimativa:** 0.2h

---

### T009 - Usar constante de paginação

**Tipo:** SEQUENTIAL
**Dependências:** T001
**Arquivos:**
- modificar: `apps/web/app/(dashboard)/suggestions/page.tsx`
- modificar: `apps/web/app/(dashboard)/marketplace/products/page.tsx`

**Descrição:**
Substituir `limit: 12` por `limit: PAGINATION.DEFAULT_LIMIT`

**Critérios de Aceite:**
- [x] Importar PAGINATION
- [x] Usar constante

**Estimativa:** 0.1h

---

## Ordem de Execução

1. **T001 (SEQUENTIAL):** Criar constante de paginação
2. **T002-T006 (PARALLEL-GROUP-1):** Substituir rotas em layouts e componentes
3. **T007 (SEQUENTIAL):** Substituir rotas em páginas de auth
4. **T008 (PARALLEL-GROUP-2):** Usar constantes de status
5. **T009 (SEQUENTIAL):** Usar constante de paginação

---

## Status de Execução

- [x] T001 - Criar pagination.ts
- [x] T002 - admin/layout.tsx
- [x] T003 - dashboard/layout.tsx
- [x] T004 - DashboardShell.tsx
- [x] T005 - dashboard/page.tsx
- [x] T006 - AppHeader.tsx
- [x] T007 - Páginas de auth
- [x] T008 - Support pages status (já OK)
- [x] T009 - Pagination em listagens
