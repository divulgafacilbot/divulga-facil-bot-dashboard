import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import ytdl from '@distube/ytdl-core';
import ffmpegPath from 'ffmpeg-static';

export const TELEGRAM_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export type DownloadOptions = {
  headers?: Record<string, string>;
  strategy?: 'direct' | 'youtube';
  transcodeToMp4?: boolean;
};

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
    const contentType = response.headers['content-type'] || '';
    console.log('[downloadMediaToFile] response', {
      url,
      contentType,
      contentLength: response.headers['content-length'] || 'unknown',
      status: response.status,
    });

    const writer = fs.createWriteStream(tempPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        try {
          if (options?.transcodeToMp4 && !isMp4File(tempPath, contentType)) {
            const transcoded = await transcodeToMp4(tempPath);
            resolve(transcoded);
            return;
          }
          resolve(tempPath);
        } catch (transcodeError) {
          reject(transcodeError);
        }
      });
      writer.on('error', reject);
    });
  } catch (error: unknown) {
    // Clean up temp file if exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error instanceof Error ? error : new Error('Falha ao baixar mídia');
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

export type VideoMetadata = {
  width: number;
  height: number;
  duration?: number;
};

/**
 * Get video dimensions using ffmpeg (more reliable than ffprobe as ffmpeg-static includes it)
 * Returns null if unable to detect
 */
export function getVideoMetadata(filePath: string): VideoMetadata | null {
  if (!ffmpegPath) {
    console.error('[getVideoMetadata] ffmpeg not available');
    return null;
  }

  try {
    // Use ffmpeg -i to get video info (outputs to stderr)
    let output = '';
    try {
      // ffmpeg -i always exits with error code when no output specified, but prints info to stderr
      execSync(`"${ffmpegPath}" -i "${filePath}" 2>&1`, {
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e: any) {
      // ffmpeg returns non-zero exit code but still outputs info in the error message
      output = e.stdout || e.stderr || e.message || String(e) || '';
    }

    console.log('[getVideoMetadata] ffmpeg output length:', output.length);

    // Parse dimensions from output like "Stream #0:0(und): Video: h264 ..., 720x1280,"
    // The pattern is usually "WIDTHxHEIGHT" followed by comma or space
    const dimensionMatch = output.match(/,\s*(\d{2,4})x(\d{2,4})[\s,]/);
    if (dimensionMatch) {
      const width = parseInt(dimensionMatch[1], 10);
      const height = parseInt(dimensionMatch[2], 10);

      // Parse duration from output like "Duration: 00:00:15.00"
      const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+)/);
      let duration: number | undefined;
      if (durationMatch) {
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseInt(durationMatch[3], 10);
        duration = hours * 3600 + minutes * 60 + seconds;
      }

      console.log(`[getVideoMetadata] Detected: ${width}x${height}${duration ? `, ${duration}s` : ''}`);
      return { width, height, duration };
    }

    // Fallback: try a more generic pattern
    const fallbackMatch = output.match(/(\d{3,4})x(\d{3,4})/);
    if (fallbackMatch) {
      const width = parseInt(fallbackMatch[1], 10);
      const height = parseInt(fallbackMatch[2], 10);
      console.log(`[getVideoMetadata] Detected (fallback): ${width}x${height}`);
      return { width, height };
    }

    console.log('[getVideoMetadata] Could not parse dimensions. Output sample:', output.substring(0, 500));
    return null;
  } catch (error) {
    console.error('[getVideoMetadata] Failed to get video metadata:', error);
    return null;
  }
}

function isMp4File(filePath: string, contentType: string): boolean {
  if (contentType.includes('video/mp4')) {
    return true;
  }
  return path.extname(filePath).toLowerCase() === '.mp4';
}

async function transcodeToMp4(inputPath: string): Promise<string> {
  const ffmpegExecutable = ffmpegPath;
  if (!ffmpegExecutable) {
    throw new Error('ffmpeg não encontrado para converter o vídeo.');
  }

  const outputPath = inputPath.replace(/\.[^/.]+$/, '') + '-converted.mp4';

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outputPath,
    ];

    const ffmpeg = spawn(ffmpegExecutable, args, { stdio: 'ignore' });

    ffmpeg.on('error', (error: Error) => reject(error));
    ffmpeg.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Falha ao converter vídeo (ffmpeg exit ${code})`));
        return;
      }

      try {
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
        const stats = fs.statSync(outputPath);
        if (stats.size > TELEGRAM_MAX_FILE_SIZE) {
          throw new Error(
            `Arquivo convertido muito grande (${(stats.size / 1024 / 1024).toFixed(1)}MB). ` +
            `Limite: 50MB. Tente outro link.`
          );
        }
        resolve(outputPath);
      } catch (cleanupError: unknown) {
        reject(cleanupError);
      }
    });
  });
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
  } catch (error: unknown) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error instanceof Error ? error : new Error('Falha ao baixar mídia');
  }
}
