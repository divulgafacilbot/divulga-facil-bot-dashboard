#!/bin/bash

# Script para resolver erro de HMR no Next.js 16.1.1 com Turbopack
# Uso: chmod +x fix-turbopack-error.sh && ./fix-turbopack-error.sh

set -e

echo "🔧 Iniciando limpeza de cache do Turbopack..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para limpar pasta
clean_dir() {
    if [ -d "$1" ]; then
        echo -e "${YELLOW}Removendo:${NC} $1"
        rm -rf "$1"
        echo -e "${GREEN}✓ Removido${NC}"
    fi
}

# Navegar para pasta do projeto
cd "$(dirname "$0")" || exit

echo -e "${YELLOW}Limpando caches...${NC}"
echo ""

# Limpar caches
clean_dir "apps/web/.next"
clean_dir "apps/web/.turbo"
clean_dir ".turbo"

echo ""
echo -e "${GREEN}✓ Caches limpos com sucesso!${NC}"
echo ""

# Opcional: limpar node_modules cache
read -p "Deseja limpar cache de node_modules também? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    clean_dir "node_modules/.turbo"
    echo -e "${GREEN}✓ Node modules cache limpo${NC}"
fi

echo ""
echo -e "${GREEN}✓ Tudo pronto!${NC}"
echo -e "${YELLOW}Próximo passo:${NC} npm run dev (ou yarn dev)"
echo ""
