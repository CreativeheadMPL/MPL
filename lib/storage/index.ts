import { LocalStorageProvider } from "./local";
import { AudioStorageProvider } from "./types";

let storageInstance: AudioStorageProvider | null = null;

export function getAudioStorageProvider(): AudioStorageProvider {
  if (storageInstance) {
    return storageInstance;
  }

  const providerType = process.env.AUDIO_STORAGE_PROVIDER || "local";

  switch (providerType) {
    case "r2":
    case "s3":
      // Production note: For Cloudflare R2 or AWS S3, install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
      // and instantiate S3StorageProvider. Falling back to local for current environment.
      storageInstance = new LocalStorageProvider();
      break;
    case "local":
    default:
      storageInstance = new LocalStorageProvider();
      break;
  }

  return storageInstance;
}

export * from "./types";
