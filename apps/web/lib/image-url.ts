/**
 * Helper para construir URL completa de imagens servidas pela API
 */
export function getFullImageUrl(url: string | undefined | null, fallback = '/logo-bot-bg.png'): string {
  if (!url) return fallback;

  // Se a URL já é absoluta, retorna ela mesma
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Se é uma URL relativa do servidor de uploads, adiciona o base URL da API
  if (url.startsWith('/uploads/')) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    return `${apiBaseUrl}${url}`;
  }

  // Para outras URLs (como assets locais), retorna como está
  return url;
}
