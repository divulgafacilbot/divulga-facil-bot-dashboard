# 🔧 Solução: Erro de HMR no Next.js 16.1.1 com Turbopack

## Problema
```
Module [project]/apps/web/lib/constants.ts was instantiated because it was required from 
module [project]/apps/web/app/dashboard/page.tsx, but the module factory is not available. 
It might have been deleted in an HMR update.
```

Este erro ocorre quando o Turbopack (novo bundler do Next.js) perde a referência de um módulo durante Hot Module Replacement (HMR).

---

## ✅ Solução 1: Limpeza Rápida de Cache (RECOMENDADO)

### Opção 1A: Usando o script fornecido
```bash
cd implementation/divulga-facil-bot-dashboard
chmod +x fix-turbopack-error.sh
./fix-turbopack-error.sh
npm run dev
```

### Opção 1B: Comando manual
```bash
cd implementation/divulga-facil-bot-dashboard

# Remove todos os caches
rm -rf apps/web/.next
rm -rf apps/web/.turbo
rm -rf .turbo

# Reinicia o servidor
npm run dev
```

### Opção 1C: Com limpeza completa
```bash
cd implementation/divulga-facil-bot-dashboard

# Limpeza profunda
rm -rf apps/web/.next apps/web/.turbo .turbo node_modules/.turbo

# Reinstalar dependências (opcional, se persistir)
npm install
# ou
yarn install

npm run dev
```

---

## ✅ Solução 2: Desabilitar Turbopack Temporariamente

Se o problema persistir, você pode usar webpack como bundler:

### Editar `package.json`
```json
{
  "scripts": {
    "dev": "next dev --no-turbopack",
    "dev:turbo": "next dev"
  }
}
```

Depois execute:
```bash
npm run dev
```

---

## ✅ Solução 3: Atualizar Configuração do Next.js

Adicionar esta configuração ao `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  // ... outras configs ...
  
  // Melhorar estabilidade do Turbopack
  experimental: {
    turbopack: {
      resolveAlias: {
        '@/lib': './lib',
        '@/components': './components',
        '@/app': './app',
      },
    },
  },
};
```

---

## ✅ Solução 4: Corrigir Importações Circulares

Verificar se há importações circulares em `constants.ts`:

```typescript
// ❌ EVITAR: Importações circulares
// In constants/routes.ts
// import { BOT_NAME } from '../constants';

// ✅ CORRETO: Imports separados e diretos
export const ROUTES = { /* ... */ };
```

---

## 📋 Checklist de Resolução

- [ ] Executar Solução 1 (limpeza de cache)
- [ ] Se não funcionar → Solução 2 (desabilitar Turbopack)
- [ ] Se ainda houver problema → Verificar imports circulares (Solução 4)
- [ ] Último recurso → Atualizar Next.js para versão mais recente

---

## 🐛 Problemas Relacionados

### Causa Raiz Comum
- **Edições rápidas** durante HMR podem deixar módulos órfãos
- **Imports circulares** entre arquivos de constantes
- **Cache desatualizado** do Turbopack

### Prevenção
1. Evitar edições muito rápidas (aguarde HMR completar)
2. Estruturar imports de forma linear (sem ciclos)
3. Usar absolute imports (`@/lib/constants`)
4. Manter estrutura de pastas consistente

---

## 🔄 Fluxo de Resolução Recomendado

```
1. Tentar Solução 1 (90% dos casos resolvem aqui)
   ↓
2. Se não funcionar, tentar Solução 2
   ↓
3. Se não funcionar, verificar Solução 4
   ↓
4. Último recurso: Atualizar Next.js
```

---

## 📝 Referências

- [Next.js 16 Turbopack Issues](https://github.com/vercel/next.js/discussions)
- [Turbopack Module Resolution](https://turbo.build/pack/docs)
- [Next.js HMR Troubleshooting](https://nextjs.org/docs/architecture/fast-refresh)

---

## 💡 Dicas de Desenvolvimento

Para evitar este erro no futuro:

1. **Usar `--no-turbopack` durante desenvolvimento** se tiver muitas edições rápidas
2. **Separar constantes por domínio** (routes, copy, status, etc.)
3. **Evitar re-exports desnecessários** em `constants.ts`
4. **Usar `useCallback` e `useMemo`** para reduzir re-renders

---

Gerado em: $(date)
