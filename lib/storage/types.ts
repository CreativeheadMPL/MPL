import { Readable } from "stream";

export interface AudioFileInfo {
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  duration?: number;
}

export interface AudioStreamResult {
  stream: Readable;
  contentLength: number;
  totalSize: number;
  mimeType: string;
  contentRange?: string;
  status: number; // 200 for full content, 206 for partial content
}

export interface AudioStorageProvider {
  /**
   * Upload an audio file to the storage provider
   */
  upload(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<AudioFileInfo>;

  /**
   * Delete an audio file by its key
   */
  delete(key: string): Promise<void>;

  /**
   * Retrieve audio stream supporting HTTP range requests for fluid scrubbing
   */
  getAudioStream(
    key: string,
    range?: { start?: number; end?: number }
  ): Promise<AudioStreamResult>;

  /**
   * Generate a temporary signed or stream URL for listening
   */
  getTemporaryUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Check if an audio file exists in storage
   */
  exists(key: string): Promise<boolean>;
}
