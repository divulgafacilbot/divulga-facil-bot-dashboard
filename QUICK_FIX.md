# ⚡ Quick Fix - Erro de HMR no Login

## 🚀 Solução Rápida (Execute AGORA)

```bash
# 1. Abra o terminal na pasta raiz do projeto
cd implementation/divulga-facil-bot-dashboard

# 2. Execute a limpeza de cache
rm -rf apps/web/.next apps/web/.turbo .turbo

# 3. Reinicie o servidor de desenvolvimento
npm run dev
# ou
yarn dev

# 4. Aguarde o build completo (leva ~30-60 segundos)
# Você verá: "✓ Ready in Xs"
```

---

## ✅ Se a Solução 1 não funcionar...

### Opção A: Desabilitar Turbopack
```bash
cd implementation/divulga-facil-bot-dashboard

# Parar servidor (Ctrl+C)

# Usar webpack temporariamente
npm run dev -- --no-turbopack
```

### Opção B: Limpeza Profunda
```bash
cd implementation/divulga-facil-bot-dashboard

# Parar servidor (Ctrl+C)

# Limpeza completa
rm -rf apps/web/.next apps/web/.turbo .turbo node_modules/.turbo

# Reinstalar (opcional)
npm install

# Reiniciar
npm run dev
```

---

## 📊 Status Esperado

### ✅ Funcionando
```
✓ Ready in 2.5s
```
Acesse: http://localhost:3000/login

### ❌ Ainda com erro?
```
Module [...] was instantiated because it was required from [...]
but the module factory is not available.
```
→ Tente a **Opção B** acima

---

## 🔄 Causa do Erro

O Turbopack (novo bundler do Next.js 16) tem um bug de cache onde durante desenvolvimento muito rápido, ele perde referências de módulos. A limpeza resolve 95% dos casos.

---

## 💡 Para Evitar no Futuro

1. **Aguarde o HMR completar** antes de editar novamente (veja "Ready in 2.5s")
2. **Use `--no-turbopack`** se fizer edições muito frequentes:
   ```bash
   npm run dev -- --no-turbopack
   ```
3. **Limpe cache regularmente:**
   ```bash
   rm -rf .next .turbo
   ```

---

## 📞 Se Nada Funcionar

1. Verifique se está usando a porta correta: `localhost:3000`
2. Verifique se a API backend está rodando: `localhost:4000`
3. Limpe também o cache do navegador: `Ctrl+Shift+Delete`
4. Tente em modo anônimo/privado do navegador

---

**Tempo estimado:** 1-2 minutos ⏱️
