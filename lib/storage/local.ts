import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { AudioFileInfo, AudioStorageProvider, AudioStreamResult } from "./types";

export class LocalStorageProvider implements AudioStorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    // Files are strictly stored outside public directory
    this.baseDir =
      baseDir ||
      process.env.LOCAL_STORAGE_DIR ||
      path.join(process.cwd(), "storage", "audio");

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    // Sanitize key to prevent directory traversal
    const safeKey = path.basename(key);
    return path.join(this.baseDir, safeKey);
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<AudioFileInfo> {
    const ext = path.extname(filename).toLowerCase() || ".mp3";
    const uniqueKey = `${uuidv4()}${ext}`;
    const filePath = this.getFilePath(uniqueKey);

    await fs.promises.writeFile(filePath, buffer);

    return {
      key: uniqueKey,
      filename,
      size: buffer.length,
      mimeType: mimeType || this.inferMimeType(ext),
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    return fs.existsSync(filePath);
  }

  async getAudioStream(
    key: string,
    range?: { start?: number; end?: number }
  ): Promise<AudioStreamResult> {
    const filePath = this.getFilePath(key);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${key}`);
    }

    const stat = await fs.promises.stat(filePath);
    const totalSize = stat.size;
    const ext = path.extname(key).toLowerCase();
    const mimeType = this.inferMimeType(ext);

    if (range && (range.start !== undefined || range.end !== undefined)) {
      const start = range.start ?? 0;
      const end = range.end !== undefined ? Math.min(range.end, totalSize - 1) : totalSize - 1;
      const contentLength = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });

      return {
        stream,
        contentLength,
        totalSize,
        mimeType,
        contentRange: `bytes ${start}-${end}/${totalSize}`,
        status: 206, // Partial Content
      };
    }

    const stream = fs.createReadStream(filePath);
    return {
      stream,
      contentLength: totalSize,
      totalSize,
      mimeType,
      status: 200,
    };
  }

  async getTemporaryUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    // For local storage, the URL points through the secured internal streaming proxy
    // Raw filesystem path is never exposed to the client
    return `/api/audio/${encodeURIComponent(key)}`;
  }

  private inferMimeType(ext: string): string {
    switch (ext) {
      case ".mp3":
        return "audio/mpeg";
      case ".wav":
        return "audio/wav";
      case ".m4a":
      case ".mp4":
        return "audio/mp4";
      case ".aac":
        return "audio/aac";
      case ".flac":
        return "audio/flac";
      case ".ogg":
        return "audio/ogg";
      default:
        return "audio/mpeg";
    }
  }
}
