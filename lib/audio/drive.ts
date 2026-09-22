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
    // Direct download/stream endpoint from Google Drive usercontent with confirmation flag
    // This bypasses the Google Drive virus scan warning page on files > 25MB (e.g. 100MB+ WAV files)
    return `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`;
  }
  // If already an external HTTP/HTTPS audio URL, return directly
  return input.trim();
}

/**
 * Fetches an audio stream from Google Drive or external URL with Range header forwarding
 * and automatic bypass for Google Drive's virus scan confirmation prompt on large files (>25MB).
 */
export async function fetchGoogleDriveAudioStream(
  audioSource: string,
  rangeHeader?: string | null
): Promise<Response> {
  const driveId = extractGoogleDriveId(audioSource);
  const streamUrl = getGoogleDriveStreamUrl(audioSource);

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
  };

  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  let res = await fetch(streamUrl, {
    headers,
    redirect: "follow",
  });

  const contentType = res.headers.get("content-type") || "";

  // If Google still returned an HTML virus scan confirmation page (e.g. uc? fallback or dynamic token requirement)
  if (contentType.includes("text/html") && driveId) {
    try {
      const html = await res.text();
      // Look for confirmation form: <form id="download-form" action="..." or <form action="..."
      const formMatch = html.match(/<form[^>]+action=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/i);
      if (formMatch) {
        const actionUrl = formMatch[1];
        const formBody = formMatch[2];
        const inputMatches = [...formBody.matchAll(/<input[^>]+name=["']([^"']+)["'][^>]+value=["']([^"']*)["']/gi)];
        const params = new URLSearchParams();
        for (const m of inputMatches) {
          params.set(m[1], m[2]);
        }
        if (!params.has("confirm")) params.set("confirm", "t");
        if (!params.has("export")) params.set("export", "download");
        if (!params.has("id")) params.set("id", driveId);

        const cookieHeader = res.headers.get("set-cookie");
        const secondaryHeaders = { ...headers };
        if (cookieHeader) {
          secondaryHeaders["Cookie"] = cookieHeader;
        }

        const confirmUrl = `${actionUrl}?${params.toString()}`;
        res = await fetch(confirmUrl, {
          headers: secondaryHeaders,
          redirect: "follow",
        });
      }
    } catch (e) {
      console.warn("Failed to parse Google Drive confirmation form:", e);
    }
  }

  return res;
}
