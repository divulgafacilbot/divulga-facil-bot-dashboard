import axios from 'axios';
import fs from 'fs';
import path from 'path';
import ytdl from '@distube/ytdl-core';

export const TELEGRAM_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export type DownloadOptions = { headers?: Record<string, string>; strategy?: 'direct' | 'youtube' };

export async function downloadMediaToFile(
  url: string,
  filename: string,
  options?: DownloadOptions
): Promise<string> {
  if (options?.strategy === 'youtube') {
    return downloadYouTubeToFile(url, filename);
  }

  const tempPath = path.join(TEMP_DIR, filename);

  try {
    // Check file size first
    let contentLength = 0;
    try {
      const headResponse = await axios.head(url, { headers: options?.headers });
      contentLength = parseInt(headResponse.headers['content-length'] || '0', 10);
    } catch (headError) {
      // Some providers block HEAD requests; continue without size precheck.
      contentLength = 0;
    }

    if (contentLength > TELEGRAM_MAX_FILE_SIZE) {
      throw new Error(
        `Arquivo muito grande (${(contentLength / 1024 / 1024).toFixed(1)}MB). ` +
        `Limite: 50MB. Tente outro link.`
      );
    }

    // Download file
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
      headers: options?.headers,
    });

    const writer = fs.createWriteStream(tempPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(tempPath));
      writer.on('error', reject);
    });
  } catch (error: any) {
    // Clean up temp file if exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Arquivo temporário removido: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao remover arquivo temporário ${filePath}:`, error);
  }
}

async function downloadYouTubeToFile(url: string, filename: string): Promise<string> {
  const tempPath = path.join(TEMP_DIR, filename);

  try {
    const info = await ytdl.getInfo(url, {
      playerClients: ['ANDROID', 'WEB'],
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    });

    const formats = info.formats.filter((format) => format.hasAudio && format.hasVideo);
    const withSize = formats
      .map((format) => ({
        format,
        size: parseInt(format.contentLength || '0', 10),
      }))
      .filter((entry) => Number.isFinite(entry.size));

    const underLimit = withSize
      .filter((entry) => entry.size > 0 && entry.size <= TELEGRAM_MAX_FILE_SIZE)
      .sort((a, b) => b.size - a.size);

    const chosen = underLimit[0]?.format
      || withSize.sort((a, b) => a.size - b.size)[0]?.format
      || ytdl.chooseFormat(formats, { quality: 'highest' });

    if (!chosen) {
      throw new Error('Não foi possível escolher um formato de vídeo válido do YouTube');
    }

    if (chosen.contentLength) {
      const contentLength = parseInt(chosen.contentLength, 10);
      if (contentLength > TELEGRAM_MAX_FILE_SIZE) {
        throw new Error(
          `Arquivo muito grande (${(contentLength / 1024 / 1024).toFixed(1)}MB). ` +
          `Limite: 50MB. Tente outro link.`
        );
      }
    }

    const writer = fs.createWriteStream(tempPath);
    const stream = ytdl.downloadFromInfo(info, {
      format: chosen,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    });

    stream.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(tempPath));
      writer.on('error', reject);
      stream.on('error', reject);
    });
  } catch (error: any) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}
