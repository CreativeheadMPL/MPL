/**
 * Utilities for extracting Google Drive file IDs and constructing direct audio stream URLs.
 */

export function extractGoogleDriveId(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  // Pattern 1: https://drive.google.com/file/d/<ID>/view...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // Pattern 2: id=<ID> in query string (open?id=..., uc?id=..., etc.)
  const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch && idQueryMatch[1]) {
    return idQueryMatch[1];
  }

  // Pattern 3: docs.google.com/uc?export=download&id=<ID>
  const ucMatch = trimmed.match(/\/uc\?.*?id=([a-zA-Z0-9_-]+)/);
  if (ucMatch && ucMatch[1]) {
    return ucMatch[1];
  }

  // Pattern 4: Raw file ID directly pasted (typically 25 to 50 base64-like characters)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function isGoogleDriveLink(input: string): boolean {
  return extractGoogleDriveId(input) !== null;
}

export function getGoogleDriveStreamUrl(input: string): string {
  const driveId = extractGoogleDriveId(input);
  if (driveId) {
    // Direct download/stream endpoint from Google Drive
    return `https://drive.google.com/uc?export=download&id=${driveId}`;
  }
  // If already an external HTTP/HTTPS audio URL, return directly
  return input.trim();
}
