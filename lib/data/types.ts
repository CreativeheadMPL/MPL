export type LinkStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface Track {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  project?: string;
  description?: string;
  artwork: string; // e.g., "/artwork/sample-01.svg" or custom image URL
  audioFile: string; // Google Drive share link, file ID, or audio URL
  duration: number; // Duration in seconds (e.g. 180)
  createdAt: string; // ISO 8601 string
}

export interface ListeningLink {
  id: string;
  trackId: string;
  token: string; // E.g., "MP-7K29X8QF"
  hasPassword: boolean;
  passwordHash?: string; // SHA-256 / bcrypt hash if password protected
  expiresAt: string | null; // ISO 8601 string or null for no expiration
  status: LinkStatus;
  createdAt: string;
  revokedAt?: string;
}

export interface TrackWithLink extends Track {
  link?: ListeningLink;
}
