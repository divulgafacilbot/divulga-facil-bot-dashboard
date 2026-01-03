import axios from 'axios';
import fs from 'fs';
import path from 'path';

const TELEGRAM_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function downloadMediaToFile(url: string, filename: string): Promise<string> {
  const tempPath = path.join(TEMP_DIR, filename);

  try {
    // Check file size first
    const headResponse = await axios.head(url);
    const contentLength = parseInt(headResponse.headers['content-length'] || '0', 10);

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
