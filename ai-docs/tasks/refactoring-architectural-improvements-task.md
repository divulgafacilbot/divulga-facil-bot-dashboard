# Task: Architectural Refactoring - Scalability & Best Practices

<metadata>
spec-type: refactoring
test-framework: vitest + @testing-library/react
test-command: npm test
estimated-hours: 16
complexity: high
priority: P0
</metadata>

<overview>
Refatoração arquitetural completa do frontend (apps/web) para eliminar más práticas identificadas na revisão de código e implementar padrões escaláveis. Foco em centralização de configurações, otimização de performance, type-safety e melhor separação de responsabilidades entre client/server components.

**Objetivos principais:**
1. Centralizar todas as configurações hardcoded (rotas, strings, env vars)
2. Migrar dashboard layout para Server Components
3. Implementar validação de environment variables
4. Substituir `<img>` por `next/image` e `<a>` por `<Link>`
5. Eliminar tipos `any` e criar sistema robusto de types
6. Implementar error boundaries e loading states

**Impacto esperado:**
- Performance: +40% (Server Components, next/image, cache)
- Manutenibilidade: +60% (centralização, types)
- SEO: +30% (metadata, Server Components)
- Type-safety: 95%+ (eliminação de any)
</overview>

<input-extraction>
## Arquitetura atual (problemas)

**Configurações descentralizadas:**
- Rotas hardcoded em 15+ arquivos
- Strings UI duplicadas em 30+ componentes
- process.env sem validação em 20+ arquivos
- Mock user em produção (SECURITY ISSUE)

**Performance issues:**
- Dashboard layout 100% client-side (274 linhas)
- Fetch cascading no client (useEffect)
- `<img>` sem otimização (4 ocorrências)
- `<a>` quebrando SPA (navegação interna)

**Type-safety issues:**
- 20+ ocorrências de `any`
- Sem validação de dados da API
- Interfaces ausentes para responses

**Error handling:**
- Nenhuma rota tem error.tsx
- Nenhuma rota tem loading.tsx
- Try-catch inconsistente

## Restrições e requisitos

**MUST:**
- Manter 100% de compatibilidade backward (nenhuma quebra de funcionalidade)
- Todos os testes existentes devem continuar passando
- Zero downtime na migração
- Type-safety: eliminar ALL `any` types

**SHOULD:**
- Melhorar performance (Lighthouse score +20 pontos)
- Reduzir bundle size do client (-30%)
- Implementar cache strategy (Next.js revalidate)

**MUST NOT:**
- Mudar comportamento da UI
- Quebrar rotas existentes
- Alterar schema do banco de dados
- Modificar APIs (backend)
</input-extraction>

<dependencies>
**Packages a instalar:**
```json
{
  "dependencies": {
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0"
  }
}
```

**Dependências internas:**
- Todos os componentes em `apps/web/components/`
- Todas as páginas em `apps/web/app/`
- Lib API em `apps/web/lib/api.ts`
- Types existentes em `apps/web/types/`

**Ordem de execução:**
1. Criar estrutura de constants PRIMEIRO (base para tudo)
2. Validação de env (antes de usar env)
3. Types (antes de refatorar components)
4. Refatorar layout (usa constants + types)
5. Otimizar imagens/links (após layout)
6. Error boundaries (por último, overlay sobre tudo)
</dependencies>

<tdd-approach>
## Estratégia de testes

**Unit tests:**
- Validação de env vars (Zod schemas)
- Utility functions (formatters, parsers)
- Constants exports (garantir imutabilidade)

**Integration tests:**
- Server Components render
- Client Components interação
- Navigation (Link components)

**E2E tests:**
- Smoke test: dashboard load
- Navigation flow: login → dashboard → bots
- Error boundaries: trigger error, verify UI

**Coverage mínimo esperado:** 85%

## Testes a criar ANTES da implementação

```typescript
// apps/web/__tests__/config/env.test.ts
describe('Environment validation', () => {
  it('should validate all required env vars', () => {
    // Test Zod schema
  });

  it('should throw error for invalid URL', () => {
    // Test validation
  });
});

// apps/web/__tests__/constants/routes.test.ts
describe('Routes constants', () => {
  it('should have all dashboard routes defined', () => {
    // Test structure
  });

  it('should generate dynamic routes correctly', () => {
    // Test function routes
  });
});

// apps/web/__tests__/components/dashboard-shell.test.tsx
describe('DashboardShell', () => {
  it('should render sidebar and header', () => {
    // Component test
  });

  it('should toggle sidebar state', () => {
    // Interaction test
  });
});
```
</tdd-approach>

<task-list>
## SEQUENTIAL TASKS (executar em ordem)

---

### T001 - Criar estrutura de diretórios para constants e config
**Type:** SEQUENTIAL
**Dependencies:** none
**Files affected:**
- `apps/web/lib/constants/` (NEW DIRECTORY)
- `apps/web/lib/constants/routes.ts` (NEW)
- `apps/web/lib/constants/copy.ts` (NEW)
- `apps/web/lib/constants/status.ts` (NEW)
- `apps/web/lib/config/` (NEW DIRECTORY)
- `apps/web/lib/config/env.ts` (NEW)

**Description:**
Criar estrutura de pastas e arquivos base para centralizar configurações.

**Implementation steps:**
1. Criar diretórios `lib/constants/` e `lib/config/`
2. Criar arquivo `routes.ts` com TODAS as rotas da aplicação
3. Criar arquivo `copy.ts` com strings UI centralizadas
4. Criar arquivo `status.ts` com enums de status
5. Criar arquivo `env.ts` com schema Zod para validação

**Validation:**
- Diretórios existem
- Arquivos criados compilam sem erro
- Exports estão corretos

---

### T002 - Implementar validação de environment variables com Zod
**Type:** SEQUENTIAL
**Dependencies:** T001
**Files affected:**
- `apps/web/lib/config/env.ts` (MODIFY)
- `apps/web/package.json` (MODIFY - adicionar zod se não existir)

**Description:**
Implementar validação type-safe de todas as environment variables usando Zod, com defaults e error handling adequado.

**Implementation steps:**
1. Verificar se `zod` está instalado, senão instalar: `npm install zod`
2. Criar schema Zod em `env.ts`:
   ```typescript
   import { z } from 'zod';

   const envSchema = z.object({
     NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:4000'),
     NEXT_PUBLIC_API_URL: z.string().url().optional(),
     NEXT_PUBLIC_WEB_URL: z.string().url().optional(),
     NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
   });

   function validateEnv() {
     const parsed = envSchema.safeParse(process.env);
     if (!parsed.success) {
       console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
       throw new Error('Invalid environment variables');
     }
     return parsed.data;
   }

   export const env = validateEnv();
   export type Env = z.infer<typeof envSchema>;
   ```
3. Exportar `env` como singleton validado
4. Adicionar JSDoc comments explicando cada var

**Validation:**
- Schema compila
- Validação funciona (testar com env inválido)
- Export é type-safe

---

### T003 - Centralizar todas as rotas em constants
**Type:** SEQUENTIAL
**Dependencies:** T001
**Files affected:**
- `apps/web/lib/constants/routes.ts` (MODIFY)

**Description:**
Mapear TODAS as rotas da aplicação (dashboard, auth, admin, public) e criar objeto ROUTES centralizado.

**Implementation steps:**
1. Mapear todas as rotas existentes no código:
   - Dashboard: /dashboard, /dashboard/bots, /dashboard/templates, etc.
   - Auth: /login, /register, /forgot-password, etc.
   - Admin: /admin, /admin/users, /admin/support, etc.
   - Public: /{slug}, /{slug}/{cardSlug}
2. Criar objeto `ROUTES` com estrutura hierárquica:
   ```typescript
   export const ROUTES = {
     dashboard: {
       home: '/dashboard',
       bots: '/dashboard/bots',
       templates: '/dashboard/templates',
       billing: '/dashboard/billing',
       support: '/dashboard/support',
       settings: '/dashboard/settings',
       promotional: '/dashboard/promotional',
       publicPage: '/dashboard/pagina-publica',
     },
     auth: {
       login: '/login',
       register: '/register',
       forgotPassword: '/forgot-password',
       resetPassword: '/reset-password',
       verifyEmail: '/verify-email',
     },
     admin: {
       home: '/admin',
       users: '/admin/users',
       support: '/admin/support',
       templates: '/admin/templates',
       campaigns: '/admin/campaigns',
       promoTokens: '/admin/promo-tokens',
       bots: '/admin/bots',
       usage: '/admin/usage',
       finance: '/admin/finance',
       permissions: '/admin/permissions',
       settings: '/admin/settings',
       login: '/admin/login',
     },
     public: {
       profile: (slug: string) => `/${slug}`,
       card: (slug: string, cardSlug: string) => `/${slug}/${cardSlug}`,
     },
   } as const;
   ```
3. Adicionar type-safety com `as const`
4. Criar helper types para autocomplete

**Validation:**
- Todas as rotas da aplicação estão mapeadas
- Functions para rotas dinâmicas funcionam
- Type inference funciona (autocomplete no IDE)

---

### T004 - Centralizar strings UI (copy)
**Type:** SEQUENTIAL
**Dependencies:** T001
**Files affected:**
- `apps/web/lib/constants/copy.ts` (MODIFY)

**Description:**
Extrair TODAS as strings hardcoded de componentes e centralizar em `copy.ts`.

**Implementation steps:**
1. Grep por strings hardcoded em componentes:
   - `apps/web/app/dashboard/`
   - `apps/web/app/(auth)/`
   - `apps/web/components/`
2. Criar estrutura hierárquica em `copy.ts`:
   ```typescript
   export const COPY = {
     dashboard: {
       welcome: {
         title: 'Visão geral',
         subtitle: 'Acompanhe suas métricas e gerencie seus bots',
       },
       stats: {
         activeBots: {
           arts: 'Bots de arte ativos',
           download: 'Bots de download ativos',
         },
         emptyState: {
           arts: 'Nenhum bot de artes configurado ainda',
           download: 'Nenhum bot de download configurado ainda',
         },
         artsGenerated: 'Artes geradas',
         downloads: 'Quantidade de downloads',
         thisMonth: 'Neste mês',
       },
       quickActions: {
         title: 'Primeiros passos',
         subtitle: 'Configure sua conta para começar a usar o bot',
         createBot: 'Criar primeiro bot',
         createBotDesc: 'Configure um bot para começar a publicar',
         customizeTemplates: 'Personalizar templates',
         customizeTemplatesDesc: 'Ajuste os templates de publicação',
       },
       nav: {
         home: 'Visão geral',
         bots: 'Meus bots',
         templates: 'Editar templates',
         promotional: 'Material promocional',
         billing: 'Pagamentos',
         support: 'FAQ e Suporte',
         settings: 'Configurações',
       },
     },
     auth: {
       login: {
         title: 'Vamos configurar seus templates',
         subtitle: 'Entre com seu e-mail e senha para personalizar suas artes e publicar.',
         emailLabel: 'E-mail',
         passwordLabel: 'Senha',
         rememberMe: 'Lembrar de mim (60 dias)',
         forgotPassword: 'Esqueci minha senha',
         submit: 'Entrar',
         noAccount: 'Não tem conta?',
         createAccount: 'Criar uma conta',
       },
       errors: {
         emailNotVerified: 'E-mail não verificado. Verifique sua caixa de entrada ou solicite um novo link.',
         invalidCredentials: 'Email ou senha incorretos.',
         generic: 'Erro ao processar solicitação. Tente novamente.',
       },
     },
     errors: {
       loadingUser: 'Não foi possível carregar seus dados.',
       tryAgain: 'Tente novamente ou refaça o login.',
       goToLogin: 'Ir para o login',
     },
   } as const;
   ```
3. Exportar com `as const` para type-safety
4. Criar type helper para autocomplete

**Validation:**
- Todas as strings principais estão centralizadas
- Estrutura é navegável e intuitiva
- Types funcionam (autocomplete)

---

### T005 - Criar sistema de types centralizado
**Type:** SEQUENTIAL
**Dependencies:** T001
**Files affected:**
- `apps/web/types/` (NEW DIRECTORY)
- `apps/web/types/index.ts` (NEW)
- `apps/web/types/user.ts` (NEW)
- `apps/web/types/card.ts` (NEW)
- `apps/web/types/metrics.ts` (NEW)
- `apps/web/types/api.ts` (NEW)

**Description:**
Criar sistema robusto de types com Zod schemas para validação de dados da API.

**Implementation steps:**
1. Criar diretório `apps/web/types/`
2. Criar arquivo `user.ts`:
   ```typescript
   import { z } from 'zod';

   export const userSchema = z.object({
     id: z.string().uuid(),
     email: z.string().email(),
     role: z.enum(['USER', 'ADMIN']),
     emailVerified: z.boolean(),
     createdAt: z.string().datetime(),
     updatedAt: z.string().datetime(),
   });

   export type User = z.infer<typeof userSchema>;
   ```
3. Criar arquivo `card.ts`:
   ```typescript
   import { z } from 'zod';

   export const marketplaceSchema = z.enum(['MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU']);
   export type Marketplace = z.infer<typeof marketplaceSchema>;

   export const cardSchema = z.object({
     id: z.string().uuid(),
     slug: z.string(),
     title: z.string(),
     description: z.string().optional(),
     image_url: z.string().url(),
     affiliate_url: z.string().url(),
     marketplace: marketplaceSchema,
     category: z.string(),
     price: z.number().optional(),
     original_price: z.number().optional(),
     discount_percent: z.number().optional(),
     coupon_code: z.string().optional(),
     is_featured: z.boolean(),
     status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']),
     created_at: z.string().datetime(),
     updated_at: z.string().datetime(),
   });

   export type Card = z.infer<typeof cardSchema>;

   export const cardListResponseSchema = z.object({
     items: z.array(cardSchema),
     nextCursor: z.string().optional(),
     hasMore: z.boolean(),
   });

   export type CardListResponse = z.infer<typeof cardListResponseSchema>;
   ```
4. Criar arquivo `metrics.ts`:
   ```typescript
   import { z } from 'zod';

   export const botMetricsSchema = z.object({
     arts: z.number().int().min(0),
     download: z.number().int().min(0),
     pinterest: z.number().int().min(0),
     suggestion: z.number().int().min(0),
   });

   export const usageMetricsSchema = z.object({
     renders: z.number().int().min(0),
     downloads: z.number().int().min(0),
   });

   export const publicPageMetricsSchema = z.object({
     profileViews: z.number().int().min(0),
     cardViews: z.number().int().min(0),
     cardClicks: z.number().int().min(0),
     ctr: z.number().min(0).max(100),
   });

   export type BotMetrics = z.infer<typeof botMetricsSchema>;
   export type UsageMetrics = z.infer<typeof usageMetricsSchema>;
   export type PublicPageMetrics = z.infer<typeof publicPageMetricsSchema>;
   ```
5. Criar arquivo `api.ts`:
   ```typescript
   import { z } from 'zod';

   export const apiErrorSchema = z.object({
     message: z.string(),
     code: z.string().optional(),
     statusCode: z.number().optional(),
   });

   export type ApiError = z.infer<typeof apiErrorSchema>;

   export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
     z.object({
       success: z.boolean(),
       data: dataSchema.optional(),
       error: apiErrorSchema.optional(),
     });
   ```
6. Criar `index.ts` exportando tudo

**Validation:**
- Todos os schemas compilam
- Schemas validam dados corretamente
- Types são inferidos corretamente

---

### T006 - Eliminar todos os tipos `any` do código
**Type:** SEQUENTIAL
**Dependencies:** T005
**Files affected:**
- `apps/web/app/[slug]/page.tsx` (MODIFY)
- `apps/web/app/dashboard/page.tsx` (MODIFY)
- `apps/web/lib/api/support.ts` (MODIFY)
- `apps/web/lib/api/overview.ts` (MODIFY)
- `apps/web/lib/api/promo-tokens.ts` (MODIFY)
- `apps/web/components/admin/*.tsx` (MODIFY)

**Description:**
Substituir TODOS os 20+ tipos `any` por types apropriados usando os schemas criados em T005.

**Implementation steps:**
1. Buscar todas ocorrências de `: any` no código:
   ```bash
   grep -rn ": any" apps/web --include="*.tsx" --include="*.ts"
   ```
2. Para cada ocorrência, identificar o tipo correto e substituir:
   - `card: any` → `card: Card`
   - `error: any` → `error: ApiError | Error`
   - `metadata: any` → `metadata: Record<string, unknown>` ou schema específico
   - `params: any` → `params: { page: number; limit: number }`
3. Adicionar imports dos types:
   ```typescript
   import type { Card, User, Metrics } from '@/types';
   ```
4. Validar dados da API com Zod antes de usar:
   ```typescript
   // ANTES
   const cards = response.data.items; // any[]

   // DEPOIS
   import { cardListResponseSchema } from '@/types/card';
   const validated = cardListResponseSchema.parse(response.data);
   const cards = validated.items; // Card[]
   ```
5. Atualizar `tsconfig.json` se necessário:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true
     }
   }
   ```

**Validation:**
- Zero ocorrências de `: any` no código (exceto em testes se necessário)
- Compilação TypeScript passa sem erros
- Todos os tipos são inferidos corretamente

---

### T007 - Criar componentes de ícones reutilizáveis
**Type:** SEQUENTIAL
**Dependencies:** T001
**Files affected:**
- `apps/web/components/icons/` (NEW DIRECTORY)
- `apps/web/components/icons/index.ts` (NEW)
- `apps/web/components/icons/Dashboard.tsx` (NEW)
- `apps/web/components/icons/Bots.tsx` (NEW)
- `apps/web/components/icons/Templates.tsx` (NEW)
- `apps/web/components/icons/Promotional.tsx` (NEW)
- `apps/web/components/icons/Billing.tsx` (NEW)
- `apps/web/components/icons/Support.tsx` (NEW)
- `apps/web/components/icons/Settings.tsx` (NEW)
- `apps/web/package.json` (MODIFY)

**Description:**
Instalar `lucide-react` e criar componentes de ícones reutilizáveis para eliminar SVG paths duplicados.

**Implementation steps:**
1. Instalar lucide-react:
   ```bash
   npm install lucide-react
   ```
2. Criar diretório `apps/web/components/icons/`
3. Para cada ícone do dashboard, criar componente wrapper:
   ```typescript
   // apps/web/components/icons/Dashboard.tsx
   import { Home } from 'lucide-react';

   export const DashboardIcon = ({ className }: { className?: string }) => (
     <Home className={className} />
   );
   ```
4. Criar `index.ts` exportando todos:
   ```typescript
   export { DashboardIcon } from './Dashboard';
   export { BotsIcon } from './Bots';
   export { TemplatesIcon } from './Templates';
   // ...
   ```
5. Documentar uso no JSDoc

**Validation:**
- lucide-react instalado
- Todos os ícones funcionam
- Bundle size não aumentou significativamente (tree-shaking)

---

### T008 - Refatorar dashboard layout para Server Component
**Type:** SEQUENTIAL
**Dependencies:** T002, T003, T005, T007
**Files affected:**
- `apps/web/app/dashboard/layout.tsx` (MODIFY - quebrar em partes)
- `apps/web/components/dashboard/DashboardShell.tsx` (NEW)
- `apps/web/components/dashboard/Sidebar.tsx` (NEW)
- `apps/web/components/dashboard/Header.tsx` (NEW)
- `apps/web/lib/auth.ts` (NEW - se não existir)

**Description:**
Transformar dashboard layout em Server Component e extrair lógica client-side para componentes menores.

**Implementation steps:**
1. Criar `apps/web/lib/auth.ts` para autenticação server-side:
   ```typescript
   import { cookies } from 'next/headers';
   import { env } from '@/lib/config/env';
   import type { User } from '@/types';

   export async function getUser(): Promise<User | null> {
     const cookieStore = cookies();
     const token = cookieStore.get('auth_token');

     if (!token) return null;

     try {
       const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/me`, {
         headers: {
           Cookie: `auth_token=${token.value}`,
         },
         cache: 'no-store',
       });

       if (!res.ok) return null;

       return await res.json();
     } catch {
       return null;
     }
   }
   ```
2. Criar `apps/web/components/dashboard/DashboardShell.tsx` (Client Component):
   ```typescript
   'use client';

   import { useState } from 'react';
   import { Sidebar } from './Sidebar';
   import { Header } from './Header';
   import type { User } from '@/types';

   interface DashboardShellProps {
     user: User;
     children: React.ReactNode;
   }

   export function DashboardShell({ user, children }: DashboardShellProps) {
     const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

     return (
       <div className="min-h-screen bg-[var(--color-background)]">
         <Header user={user} />
         <Sidebar
           collapsed={sidebarCollapsed}
           onToggle={setSidebarCollapsed}
         />
         <main
           style={{
             marginLeft: sidebarCollapsed ? '50px' : '260px',
             paddingTop: '70px',
             transition: 'margin-left 300ms ease-in-out',
           }}
         >
           <div className="px-8 py-10">
             <section className="mx-auto w-full max-w-[1490px] flex flex-col gap-8">
               {children}
             </section>
           </div>
         </main>
       </div>
     );
   }
   ```
3. Criar `apps/web/components/dashboard/Sidebar.tsx` (Client Component):
   ```typescript
   'use client';

   import Link from 'next/link';
   import { usePathname } from 'next/navigation';
   import { ROUTES } from '@/lib/constants/routes';
   import { COPY } from '@/lib/constants/copy';
   import {
     DashboardIcon,
     BotsIcon,
     TemplatesIcon,
     PromotionalIcon,
     BillingIcon,
     SupportIcon,
     SettingsIcon,
   } from '@/components/icons';

   interface SidebarProps {
     collapsed: boolean;
     onToggle: () => void;
   }

   export function Sidebar({ collapsed, onToggle }: SidebarProps) {
     const pathname = usePathname();

     const navItems = [
       { name: COPY.dashboard.nav.home, href: ROUTES.dashboard.home, Icon: DashboardIcon },
       { name: COPY.dashboard.nav.bots, href: ROUTES.dashboard.bots, Icon: BotsIcon },
       { name: COPY.dashboard.nav.templates, href: ROUTES.dashboard.templates, Icon: TemplatesIcon },
       { name: COPY.dashboard.nav.promotional, href: ROUTES.dashboard.promotional, Icon: PromotionalIcon },
       { name: COPY.dashboard.nav.billing, href: ROUTES.dashboard.billing, Icon: BillingIcon },
       { name: COPY.dashboard.nav.support, href: ROUTES.dashboard.support, Icon: SupportIcon },
       { name: COPY.dashboard.nav.settings, href: ROUTES.dashboard.settings, Icon: SettingsIcon },
     ];

     return (
       <aside /* ... sidebar implementation ... */>
         {/* Render navItems with icons */}
       </aside>
     );
   }
   ```
4. Criar `apps/web/components/dashboard/Header.tsx` (Client Component)
5. Refatorar `apps/web/app/dashboard/layout.tsx` (Server Component):
   ```typescript
   import { redirect } from 'next/navigation';
   import { getUser } from '@/lib/auth';
   import { DashboardShell } from '@/components/dashboard/DashboardShell';
   import { ROUTES } from '@/lib/constants/routes';

   export default async function DashboardLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
     const user = await getUser();

     if (!user) {
       redirect(ROUTES.auth.login);
     }

     return <DashboardShell user={user}>{children}</DashboardShell>;
   }
   ```
6. REMOVER completamente a lógica de mock user (IS_PRODUCTION)

**Validation:**
- Layout renderiza no servidor
- Autenticação funciona
- Sidebar collapse funciona
- Bundle JS client reduzido em ~30%

---

### T009 - Migrar dashboard/page.tsx para Server Component com fetching paralelo
**Type:** SEQUENTIAL
**Dependencies:** T002, T005, T008
**Files affected:**
- `apps/web/app/dashboard/page.tsx` (MODIFY)
- `apps/web/lib/api/dashboard.ts` (NEW)
- `apps/web/components/dashboard/StatsGrid.tsx` (NEW)
- `apps/web/components/dashboard/QuickActions.tsx` (NEW)

**Description:**
Transformar dashboard page em Server Component com fetching paralelo no servidor.

**Implementation steps:**
1. Criar `apps/web/lib/api/dashboard.ts` com funções server-side:
   ```typescript
   import { env } from '@/lib/config/env';
   import {
     botMetricsSchema,
     usageMetricsSchema,
     publicPageMetricsSchema
   } from '@/types/metrics';

   export async function getMetrics() {
     const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/me/metrics`, {
       next: { revalidate: 60 }, // Cache por 60s
     });

     if (!res.ok) throw new Error('Failed to fetch metrics');

     const data = await res.json();
     return {
       activeBots: botMetricsSchema.parse(data.activeBots),
       usage: usageMetricsSchema.parse(data.usage),
     };
   }

   export async function getPublicPageMetrics() {
     const res = await fetch(
       `${env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/dashboard?timeRange=30d`,
       { next: { revalidate: 300 } } // Cache por 5min
     );

     if (!res.ok) return null;

     const data = await res.json();
     return publicPageMetricsSchema.parse(data.publicPage);
   }
   ```
2. Criar componentes client menores:
   - `StatsGrid.tsx` (display stats)
   - `QuickActions.tsx` (links para ações)
3. Refatorar `apps/web/app/dashboard/page.tsx`:
   ```typescript
   import { getMetrics, getPublicPageMetrics } from '@/lib/api/dashboard';
   import { StatsGrid } from '@/components/dashboard/StatsGrid';
   import { QuickActions } from '@/components/dashboard/QuickActions';
   import { COPY } from '@/lib/constants/copy';

   export default async function DashboardPage() {
     // Parallel server-side fetching
     const [metrics, publicMetrics] = await Promise.all([
       getMetrics(),
       getPublicPageMetrics(),
     ]);

     return (
       <>
         <div>
           <h1 className="text-3xl font-bold">
             {COPY.dashboard.welcome.title}
           </h1>
           <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
             {COPY.dashboard.welcome.subtitle}
           </p>
         </div>

         <StatsGrid
           activeBots={metrics.activeBots}
           usage={metrics.usage}
           publicMetrics={publicMetrics}
         />

         <QuickActions />
       </>
     );
   }
   ```

**Validation:**
- Page renderiza no servidor
- Fetching paralelo funciona
- Cache strategy funciona (verificar headers)
- Performance melhorou (TTI reduzido)

---

### T010 - Substituir todas ocorrências de `<img>` por `next/image`
**Type:** SEQUENTIAL
**Dependencies:** T002
**Files affected:**
- `apps/web/app/[slug]/page.tsx` (MODIFY)
- `apps/web/app/dashboard/pagina-publica/page.tsx` (MODIFY)
- `apps/web/components/marketplace/ProductCard.tsx` (MODIFY - se existir)

**Description:**
Buscar e substituir sistematicamente todas as tags `<img>` por `<Image>` do Next.js.

**Implementation steps:**
1. Buscar todas ocorrências de `<img`:
   ```bash
   grep -rn "<img" apps/web/app --include="*.tsx"
   ```
2. Para cada ocorrência, substituir por `<Image>`:
   - Adicionar import: `import Image from 'next/image';`
   - Adicionar propriedades `width` e `height`
   - Adicionar `alt` text apropriado
   - Considerar `loading="lazy"` e `placeholder="blur"`
3. Exemplo de substituição:
   ```typescript
   // ANTES
   <img src={card.image_url} alt={card.title} className="w-full h-48 object-cover" />

   // DEPOIS
   import Image from 'next/image';

   <Image
     src={card.image_url}
     alt={card.title}
     width={400}
     height={300}
     className="w-full h-48 object-cover"
     loading="lazy"
   />
   ```
4. Para preview de imagens em modais (support/admin), avaliar se `<img>` é aceitável (zoom/pan functionality)
5. Verificar `next.config.ts` tem `remotePatterns` configurados

**Validation:**
- Todas as imagens carregam corretamente
- WebP/AVIF são servidos automaticamente (verificar Network tab)
- Lighthouse score de performance melhorou

---

### T011 - Substituir todas ocorrências de `<a>` por `<Link>` em rotas internas
**Type:** SEQUENTIAL
**Dependencies:** T003
**Files affected:**
- `apps/web/app/[slug]/[cardSlug]/page.tsx` (MODIFY)
- Quaisquer outros arquivos com `<a href="/">`

**Description:**
Buscar e substituir `<a>` tags por `<Link>` do Next.js para rotas internas.

**Implementation steps:**
1. Buscar ocorrências de `<a href`:
   ```bash
   grep -rn '<a href="/' apps/web/app --include="*.tsx"
   ```
2. Para cada rota interna, substituir:
   ```typescript
   // ANTES
   <a href={`/${params.slug}`} className="text-sm hover:underline">
     Voltar
   </a>

   // DEPOIS
   import Link from 'next/link';
   import { ROUTES } from '@/lib/constants/routes';

   <Link href={ROUTES.public.profile(params.slug)} className="text-sm hover:underline">
     Voltar
   </Link>
   ```
3. Manter `<a>` apenas para links externos (target="_blank")
4. Adicionar `prefetch={false}` se necessário para links menos usados

**Validation:**
- Navegação interna funciona sem reload
- Prefetch funciona (Network tab mostra prefetch)
- Nenhum `<a>` para rota interna restante

---

### T012 - Implementar error.tsx em todas as rotas principais
**Type:** SEQUENTIAL
**Dependencies:** T003, T004
**Files affected:**
- `apps/web/app/error.tsx` (NEW)
- `apps/web/app/dashboard/error.tsx` (NEW)
- `apps/web/app/admin/error.tsx` (NEW)
- `apps/web/app/[slug]/error.tsx` (NEW)
- `apps/web/components/error/ErrorBoundary.tsx` (NEW)

**Description:**
Criar error boundaries usando Next.js `error.tsx` files para todas as rotas principais.

**Implementation steps:**
1. Criar componente base de erro em `apps/web/components/error/ErrorBoundary.tsx`:
   ```typescript
   'use client';

   interface ErrorBoundaryProps {
     error: Error & { digest?: string };
     reset: () => void;
     title?: string;
     message?: string;
   }

   export function ErrorBoundary({
     error,
     reset,
     title = 'Algo deu errado',
     message
   }: ErrorBoundaryProps) {
     return (
       <div className="flex min-h-screen flex-col items-center justify-center p-8">
         <div className="max-w-md text-center">
           <h2 className="text-2xl font-bold text-[var(--color-danger)] mb-4">
             {title}
           </h2>
           <p className="text-[var(--color-text-secondary)] mb-4">
             {message || error.message}
           </p>
           {error.digest && (
             <p className="text-xs text-[var(--color-text-secondary)] mb-4">
               Error ID: {error.digest}
             </p>
           )}
           <button
             onClick={reset}
             className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
           >
             Tentar novamente
           </button>
         </div>
       </div>
     );
   }
   ```
2. Criar `apps/web/app/error.tsx` (root error boundary):
   ```typescript
   'use client';

   import { ErrorBoundary } from '@/components/error/ErrorBoundary';

   export default function RootError({
     error,
     reset,
   }: {
     error: Error & { digest?: string };
     reset: () => void;
   }) {
     return (
       <ErrorBoundary
         error={error}
         reset={reset}
         title="Erro inesperado"
         message="Desculpe, algo deu errado. Tente novamente."
       />
     );
   }
   ```
3. Criar `apps/web/app/dashboard/error.tsx`:
   ```typescript
   'use client';

   import { ErrorBoundary } from '@/components/error/ErrorBoundary';

   export default function DashboardError({
     error,
     reset,
   }: {
     error: Error & { digest?: string };
     reset: () => void;
   }) {
     return (
       <ErrorBoundary
         error={error}
         reset={reset}
         title="Erro ao carregar dashboard"
       />
     );
   }
   ```
4. Criar `apps/web/app/admin/error.tsx` (similar)
5. Criar `apps/web/app/[slug]/error.tsx` (similar)

**Validation:**
- Erro capturado corretamente (testar throw new Error())
- UI de erro renderiza
- Botão "reset" funciona
- Digest/error ID aparece em produção

---

### T013 - Implementar loading.tsx em todas as rotas principais
**Type:** SEQUENTIAL
**Dependencies:** T003
**Files affected:**
- `apps/web/app/dashboard/loading.tsx` (NEW)
- `apps/web/app/admin/loading.tsx` (NEW)
- `apps/web/app/[slug]/loading.tsx` (NEW)
- `apps/web/components/loading/LoadingSpinner.tsx` (NEW)
- `apps/web/components/loading/DashboardSkeleton.tsx` (NEW)

**Description:**
Criar loading states usando Next.js `loading.tsx` files para todas as rotas principais.

**Implementation steps:**
1. Criar componente de loading base em `apps/web/components/loading/LoadingSpinner.tsx`:
   ```typescript
   export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
     const sizeClasses = {
       sm: 'h-4 w-4',
       md: 'h-8 w-8',
       lg: 'h-12 w-12',
     };

     return (
       <div className="flex items-center justify-center">
         <div
           className={`animate-spin rounded-full border-4 border-gray-200 border-t-[var(--color-primary)] ${sizeClasses[size]}`}
         />
       </div>
     );
   }
   ```
2. Criar skeleton específico para dashboard em `DashboardSkeleton.tsx`:
   ```typescript
   export function DashboardSkeleton() {
     return (
       <div className="space-y-8">
         {/* Header skeleton */}
         <div className="space-y-2">
           <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
           <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
         </div>

         {/* Stats grid skeleton */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {[1, 2, 3, 4].map((i) => (
             <div key={i} className="border rounded-2xl p-6 space-y-4">
               <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
               <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
             </div>
           ))}
         </div>
       </div>
     );
   }
   ```
3. Criar `apps/web/app/dashboard/loading.tsx`:
   ```typescript
   import { DashboardSkeleton } from '@/components/loading/DashboardSkeleton';

   export default function DashboardLoading() {
     return (
       <div className="px-8 py-10">
         <DashboardSkeleton />
       </div>
     );
   }
   ```
4. Criar `apps/web/app/admin/loading.tsx`:
   ```typescript
   import { LoadingSpinner } from '@/components/loading/LoadingSpinner';

   export default function AdminLoading() {
     return (
       <div className="flex min-h-screen items-center justify-center">
         <LoadingSpinner size="lg" />
       </div>
     );
   }
   ```
5. Criar `apps/web/app/[slug]/loading.tsx` (similar)

**Validation:**
- Loading state aparece durante navegação
- Skeleton UI combina com layout final
- Transição suave de loading → content

---

### T014 - Atualizar metadata de SEO em todas as páginas
**Type:** SEQUENTIAL
**Dependencies:** T002, T003, T004
**Files affected:**
- `apps/web/app/layout.tsx` (MODIFY)
- `apps/web/app/dashboard/layout.tsx` (ADD metadata)
- `apps/web/app/[slug]/page.tsx` (MODIFY generateMetadata)
- `apps/web/app/[slug]/[cardSlug]/page.tsx` (MODIFY generateMetadata)
- `apps/web/lib/constants/metadata.ts` (NEW)

**Description:**
Melhorar SEO adicionando metadata estruturado em todas as páginas principais.

**Implementation steps:**
1. Criar `apps/web/lib/constants/metadata.ts`:
   ```typescript
   import { Metadata } from 'next';
   import { env } from '@/lib/config/env';

   export const baseMetadata: Metadata = {
     metadataBase: new URL(env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'),
     title: {
       default: 'Divulga Fácil - Automação de Marketing para Marketplaces',
       template: '%s | Divulga Fácil',
     },
     description: 'Automatize suas publicações em redes sociais com IA. Crie artes personalizadas e publique no Instagram, TikTok e Pinterest.',
     keywords: [
       'marketing automation',
       'marketplace',
       'instagram bot',
       'tiktok bot',
       'pinterest automation',
       'social media management',
     ],
     authors: [{ name: 'Divulga Fácil' }],
     openGraph: {
       type: 'website',
       locale: 'pt_BR',
       siteName: 'Divulga Fácil',
     },
     twitter: {
       card: 'summary_large_image',
     },
     robots: {
       index: true,
       follow: true,
       googleBot: {
         index: true,
         follow: true,
       },
     },
   };
   ```
2. Atualizar `apps/web/app/layout.tsx`:
   ```typescript
   import { baseMetadata } from '@/lib/constants/metadata';

   export const metadata: Metadata = baseMetadata;
   ```
3. Adicionar metadata em `apps/web/app/dashboard/layout.tsx`:
   ```typescript
   export const metadata: Metadata = {
     title: 'Dashboard',
     description: 'Gerencie seus bots e visualize suas métricas',
     robots: {
       index: false, // Dashboard não deve ser indexado
       follow: false,
     },
   };
   ```
4. Melhorar `generateMetadata` em páginas públicas:
   ```typescript
   // apps/web/app/[slug]/page.tsx
   export async function generateMetadata({ params }: Props): Promise<Metadata> {
     const pageSettings = await getPageSettings(params.slug);

     return {
       title: pageSettings.display_name || 'Página Pública',
       description: pageSettings.bio || 'Confira meus produtos',
       openGraph: {
         title: pageSettings.display_name,
         description: pageSettings.bio,
         images: pageSettings.avatar_url ? [pageSettings.avatar_url] : [],
         url: `${env.NEXT_PUBLIC_WEB_URL}/${params.slug}`,
       },
       alternates: {
         canonical: `${env.NEXT_PUBLIC_WEB_URL}/${params.slug}`,
       },
     };
   }
   ```

**Validation:**
- Metadata aparece corretamente no `<head>`
- Open Graph tags funcionam (testar com debugger)
- Twitter cards funcionam
- robots.txt configurado corretamente

---

### T015 - Criar testes unitários para constants e config
**Type:** SEQUENTIAL
**Dependencies:** T001, T002, T003, T004
**Files affected:**
- `apps/web/__tests__/config/env.test.ts` (NEW)
- `apps/web/__tests__/constants/routes.test.ts` (NEW)
- `apps/web/__tests__/constants/copy.test.ts` (NEW)

**Description:**
Criar testes unitários para validar configurações e constants.

**Implementation steps:**
1. Criar `apps/web/__tests__/config/env.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';

   describe('Environment validation', () => {
     it('should export validated env object', () => {
       const { env } = await import('@/lib/config/env');
       expect(env).toBeDefined();
       expect(env.NEXT_PUBLIC_API_BASE_URL).toBeDefined();
     });

     it('should have valid URL format', () => {
       const { env } = await import('@/lib/config/env');
       expect(() => new URL(env.NEXT_PUBLIC_API_BASE_URL)).not.toThrow();
     });
   });
   ```
2. Criar `apps/web/__tests__/constants/routes.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { ROUTES } from '@/lib/constants/routes';

   describe('Routes constants', () => {
     it('should have all dashboard routes defined', () => {
       expect(ROUTES.dashboard.home).toBe('/dashboard');
       expect(ROUTES.dashboard.bots).toBe('/dashboard/bots');
       expect(ROUTES.dashboard.templates).toBe('/dashboard/templates');
     });

     it('should generate dynamic public routes correctly', () => {
       expect(ROUTES.public.profile('test-user')).toBe('/test-user');
       expect(ROUTES.public.card('user', 'card-123')).toBe('/user/card-123');
     });

     it('should be immutable (as const)', () => {
       // TypeScript compile error if we try to modify
       // @ts-expect-error
       expect(() => { ROUTES.dashboard.home = '/new' }).toThrow();
     });
   });
   ```
3. Criar `apps/web/__tests__/constants/copy.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { COPY } from '@/lib/constants/copy';

   describe('Copy constants', () => {
     it('should have dashboard welcome text', () => {
       expect(COPY.dashboard.welcome.title).toBeDefined();
       expect(COPY.dashboard.welcome.title).toBe('Visão geral');
     });

     it('should have all nav items', () => {
       expect(COPY.dashboard.nav.home).toBeDefined();
       expect(COPY.dashboard.nav.bots).toBeDefined();
       expect(COPY.dashboard.nav.templates).toBeDefined();
     });

     it('should have error messages', () => {
       expect(COPY.auth.errors.emailNotVerified).toBeDefined();
       expect(COPY.auth.errors.invalidCredentials).toBeDefined();
     });
   });
   ```

**Validation:**
- Todos os testes passam
- Coverage > 90% para constants

---

### T016 - Criar testes de integração para Server Components
**Type:** SEQUENTIAL
**Dependencies:** T008, T009
**Files affected:**
- `apps/web/__tests__/app/dashboard/layout.test.tsx` (NEW)
- `apps/web/__tests__/app/dashboard/page.test.tsx` (NEW)

**Description:**
Criar testes de integração para Server Components do dashboard.

**Implementation steps:**
1. Instalar dependências de teste se necessário:
   ```bash
   npm install -D @testing-library/react @testing-library/jest-dom
   ```
2. Criar `apps/web/__tests__/app/dashboard/layout.test.tsx`:
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { describe, it, expect, vi } from 'vitest';

   // Mock Next.js modules
   vi.mock('next/navigation', () => ({
     redirect: vi.fn(),
   }));

   vi.mock('@/lib/auth', () => ({
     getUser: vi.fn(() => Promise.resolve({
       id: '1',
       email: 'test@example.com',
       role: 'USER',
       emailVerified: true,
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString(),
     })),
   }));

   describe('Dashboard Layout', () => {
     it('should render dashboard shell with user', async () => {
       const DashboardLayout = (await import('@/app/dashboard/layout')).default;

       render(
         <DashboardLayout>
           <div>Test content</div>
         </DashboardLayout>
       );

       expect(screen.getByText('Test content')).toBeInTheDocument();
     });

     it('should redirect to login if no user', async () => {
       const { redirect } = await import('next/navigation');
       const { getUser } = await import('@/lib/auth');

       vi.mocked(getUser).mockResolvedValueOnce(null);

       const DashboardLayout = (await import('@/app/dashboard/layout')).default;

       render(
         <DashboardLayout>
           <div>Test</div>
         </DashboardLayout>
       );

       expect(redirect).toHaveBeenCalledWith('/login');
     });
   });
   ```
3. Criar `apps/web/__tests__/app/dashboard/page.test.tsx`:
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { describe, it, expect, vi } from 'vitest';

   vi.mock('@/lib/api/dashboard', () => ({
     getMetrics: vi.fn(() => Promise.resolve({
       activeBots: { arts: 2, download: 1, pinterest: 0, suggestion: 0 },
       usage: { renders: 100, downloads: 50 },
     })),
     getPublicPageMetrics: vi.fn(() => Promise.resolve({
       profileViews: 1000,
       cardViews: 500,
       cardClicks: 50,
       ctr: 10,
     })),
   }));

   describe('Dashboard Page', () => {
     it('should render stats', async () => {
       const DashboardPage = (await import('@/app/dashboard/page')).default;

       render(<DashboardPage />);

       expect(screen.getByText('Visão geral')).toBeInTheDocument();
       // Verify stats render
     });
   });
   ```

**Validation:**
- Testes passam
- Server Components testam corretamente

---

### T017 - Smoke test E2E com Playwright
**Type:** SEQUENTIAL
**Dependencies:** T008, T009, T012, T013
**Files affected:**
- `apps/web/tests/e2e/smoke.spec.ts` (NEW)

**Description:**
Criar smoke test E2E para verificar fluxo crítico: login → dashboard → navegação.

**Implementation steps:**
1. Criar `apps/web/tests/e2e/smoke.spec.ts`:
   ```typescript
   import { test, expect } from '@playwright/test';
   import { ROUTES } from '@/lib/constants/routes';

   test.describe('Smoke tests', () => {
     test('should load login page', async ({ page }) => {
       await page.goto(ROUTES.auth.login);
       await expect(page).toHaveTitle(/Divulga Fácil/);
       await expect(page.locator('input[type="email"]')).toBeVisible();
     });

     test('should navigate to dashboard after login', async ({ page }) => {
       await page.goto(ROUTES.auth.login);

       // Fill login form
       await page.fill('input[type="email"]', 'test@example.com');
       await page.fill('input[type="password"]', 'password123');
       await page.click('button[type="submit"]');

       // Should redirect to dashboard
       await page.waitForURL(ROUTES.dashboard.home);
       await expect(page.locator('h1')).toContainText('Visão geral');
     });

     test('should navigate between dashboard pages', async ({ page }) => {
       // Assume logged in
       await page.goto(ROUTES.dashboard.home);

       // Navigate to bots
       await page.click(`a[href="${ROUTES.dashboard.bots}"]`);
       await page.waitForURL(ROUTES.dashboard.bots);

       // Navigate to templates
       await page.click(`a[href="${ROUTES.dashboard.templates}"]`);
       await page.waitForURL(ROUTES.dashboard.templates);
     });

     test('should show error boundary on error', async ({ page }) => {
       // Trigger error (mock API failure)
       await page.route('**/api/me/metrics', (route) => route.abort());

       await page.goto(ROUTES.dashboard.home);

       // Should show error UI
       await expect(page.locator('text=/Erro|Error/')).toBeVisible();
       await expect(page.locator('button:has-text("Tentar novamente")')).toBeVisible();
     });
   });
   ```
2. Adicionar script no `package.json`:
   ```json
   {
     "scripts": {
       "test:e2e": "playwright test",
       "test:e2e:ui": "playwright test --ui"
     }
   }
   ```

**Validation:**
- Todos os smoke tests passam
- Error boundaries funcionam
- Navegação está fluida

---

### T018 - Documentar mudanças e criar guia de migração
**Type:** SEQUENTIAL
**Dependencies:** ALL previous tasks
**Files affected:**
- `apps/web/REFACTORING_GUIDE.md` (NEW)
- `apps/web/lib/constants/README.md` (NEW)
- `apps/web/lib/config/README.md` (NEW)

**Description:**
Documentar todas as mudanças arquiteturais e criar guia para desenvolvedores.

**Implementation steps:**
1. Criar `apps/web/REFACTORING_GUIDE.md`:
   ```markdown
   # Guia de Refatoração Arquitetural

   ## Mudanças Principais

   ### 1. Centralização de Configurações
   - **Rotas:** `lib/constants/routes.ts`
   - **Strings UI:** `lib/constants/copy.ts`
   - **Env vars:** `lib/config/env.ts` (validado com Zod)

   ### 2. Server Components
   - Dashboard layout migrado para Server Component
   - Fetching no servidor (paralelo, com cache)
   - Componentes client menores e focados

   ### 3. Type-Safety
   - Zero tipos `any`
   - Schemas Zod para validação de API
   - Types centralizados em `types/`

   ### 4. Performance
   - `next/image` para todas imagens
   - `next/link` para navegação interna
   - Cache strategy implementada

   ### 5. Error Handling
   - `error.tsx` em todas rotas principais
   - `loading.tsx` com skeletons
   - Boundary components reutilizáveis

   ## Como Usar

   ### Adicionar nova rota
   1. Adicionar em `lib/constants/routes.ts`
   2. Usar `ROUTES.section.name` no código
   3. Criar `error.tsx` e `loading.tsx`

   ### Adicionar nova string UI
   1. Adicionar em `lib/constants/copy.ts`
   2. Usar `COPY.section.key` no código

   ### Criar novo tipo
   1. Criar schema Zod em `types/`
   2. Exportar type inferido
   3. Usar para validação de API

   ## Checklist para PRs
   - [ ] Nenhum `any` type adicionado
   - [ ] Rotas usam `ROUTES` constant
   - [ ] Strings UI usam `COPY` constant
   - [ ] Imagens usam `next/image`
   - [ ] Links internos usam `next/link`
   - [ ] Testes adicionados
   ```
2. Criar `apps/web/lib/constants/README.md`:
   ```markdown
   # Constants

   Configurações centralizadas da aplicação.

   ## Arquivos

   - `routes.ts`: Todas as rotas da aplicação
   - `copy.ts`: Strings UI (i18n-ready)
   - `status.ts`: Enums de status

   ## Uso

   ```typescript
   import { ROUTES } from '@/lib/constants/routes';
   import { COPY } from '@/lib/constants/copy';

   <Link href={ROUTES.dashboard.bots}>
     {COPY.dashboard.nav.bots}
   </Link>
   ```
   ```
3. Criar `apps/web/lib/config/README.md`:
   ```markdown
   # Config

   Configurações validadas da aplicação.

   ## env.ts

   Todas as environment variables são validadas usando Zod.

   ```typescript
   import { env } from '@/lib/config/env';

   const apiUrl = env.NEXT_PUBLIC_API_BASE_URL; // Type-safe!
   ```

   ## Adicionar nova env var

   1. Adicionar ao schema em `env.ts`
   2. Adicionar ao `.env.example`
   3. Documentar no README
   ```

**Validation:**
- Documentação clara e completa
- Exemplos funcionam
- Próximos desenvolvedores entendem as mudanças

</task-list>

<validation-strategy>
## Estratégia de validação por fase

**FASE 1: Constants & Config (T001-T004)**
- [ ] Compilação TypeScript sem erros
- [ ] Exports são type-safe
- [ ] Constants são imutáveis (as const)

**FASE 2: Types (T005-T006)**
- [ ] Zero tipos `any` no código
- [ ] Schemas Zod validam corretamente
- [ ] Type inference funciona

**FASE 3: Refatoração de Components (T007-T009)**
- [ ] Bundle JS client reduzido em 30%+
- [ ] Server Components renderizam
- [ ] Autenticação funciona
- [ ] Fetching paralelo funciona

**FASE 4: Otimizações (T010-T011)**
- [ ] Todas imagens usam next/image
- [ ] Navegação interna usa next/link
- [ ] WebP/AVIF servidos automaticamente

**FASE 5: Error Handling (T012-T013)**
- [ ] Error boundaries capturam erros
- [ ] Loading states aparecem
- [ ] UX é suave

**FASE 6: SEO & Testes (T014-T017)**
- [ ] Metadata estruturado presente
- [ ] Testes unitários passam (coverage > 85%)
- [ ] Smoke tests E2E passam

**FASE 7: Documentação (T018)**
- [ ] Guias criados
- [ ] Exemplos funcionam

## Métricas de sucesso

**Performance (Lighthouse):**
- Performance score: 90+ (atual: ~70)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle JS client: -30%

**Type-safety:**
- Zero tipos `any` (exceto testes)
- 95%+ coverage de tipos

**Manutenibilidade:**
- Todas rotas centralizadas (1 arquivo)
- Todas strings centralizadas (1 arquivo)
- Zero hardcoded env vars

**Testes:**
- Unit tests: 85%+ coverage
- E2E smoke tests: 100% passing
- Zero regressões

## Comandos de validação final

```bash
# Build deve passar
npm run build

# Testes devem passar
npm test
npm run test:e2e

# Linter deve passar
npm run lint

# Type check deve passar
npm run type-check

# Verificar bundle size
npm run build && ls -lh .next/static/chunks/
```
</validation-strategy>

<acceptance-criteria>
## Critérios de aceitação (TODOS devem ser atendidos)

### Funcional
- [ ] Todas as funcionalidades existentes continuam funcionando
- [ ] Autenticação funciona (login, logout, redirects)
- [ ] Dashboard carrega e exibe métricas corretamente
- [ ] Navegação entre páginas funciona sem reload
- [ ] Imagens carregam otimizadas (WebP/AVIF)
- [ ] Error boundaries capturam e exibem erros
- [ ] Loading states aparecem durante navegação

### Técnico
- [ ] Zero tipos `any` em código de produção
- [ ] Todas rotas usam `ROUTES` constant
- [ ] Todas strings UI usam `COPY` constant
- [ ] Todas env vars validadas com Zod
- [ ] Todas imagens usam `next/image`
- [ ] Links internos usam `next/link`
- [ ] Server Components para dashboard
- [ ] Client Components focados e pequenos

### Performance
- [ ] Lighthouse Performance: 90+
- [ ] First Contentful Paint: < 1.5s
- [ ] Time to Interactive: < 3s
- [ ] Bundle JS client reduzido em 30%+
- [ ] Cache strategy implementada (revalidate)

### Qualidade
- [ ] Build passa sem erros/warnings
- [ ] Testes unitários passam (coverage > 85%)
- [ ] Smoke tests E2E passam
- [ ] Linter passa sem erros
- [ ] Type-check passa sem erros

### Documentação
- [ ] REFACTORING_GUIDE.md criado
- [ ] READMEs em lib/constants/ e lib/config/
- [ ] Exemplos funcionam
- [ ] Próximos devs entendem as mudanças

### Segurança
- [ ] Mock user removido de produção
- [ ] Env vars não expostas no client
- [ ] Autenticação server-side

### UX
- [ ] Nenhuma quebra visual
- [ ] Transições suaves
- [ ] Error messages claras
- [ ] Loading states não flicker
</acceptance-criteria>
