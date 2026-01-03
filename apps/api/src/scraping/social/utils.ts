import axios from 'axios';

export const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

export const buildHeaders = (referer?: string): Record<string, string> => {
  if (!referer) {
    return { ...DEFAULT_HEADERS };
  }

  return {
    ...DEFAULT_HEADERS,
    Referer: referer,
  };
};

export async function resolveFinalUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: 10000,
      headers: DEFAULT_HEADERS,
      validateStatus: () => true,
    });
    return response.request?.res?.responseUrl || url;
  } catch (error) {
    return url;
  }
}

export function normalizeEscapedJsonPayload(payload: string): string {
  return payload
    .replace(/\\u002F/g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003D/g, '=')
    .replace(/\\u003C/g, '<')
    .replace(/\\u003E/g, '>');
}
