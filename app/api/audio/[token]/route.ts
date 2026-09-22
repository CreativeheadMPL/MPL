import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { extractGoogleDriveId, fetchGoogleDriveAudioStream } from "@/lib/audio/drive";
import { DataStore } from "@/lib/data/store";
import { getAudioStorageProvider } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const store = DataStore.getInstance();

  // Check link access
  const accessCookie = cookies().get(`mp_pass_${token}`)?.value;
  const result = await store.verifyLinkAccess(token, accessCookie);

  if (!result.allowed) {
    if (result.reason === "REVOKED") {
      return new NextResponse("Access Revoked: This sample is no longer available.", {
        status: 403,
      });
    }
    if (result.reason === "EXPIRED") {
      return new NextResponse("Sample Unavailable: This private listening link has expired.", {
        status: 410,
      });
    }
    if (result.reason === "PASSWORD_REQUIRED" || result.reason === "INVALID_PASSWORD") {
      return new NextResponse("Password required for confidential playback.", {
        status: 401,
      });
    }
    return new NextResponse("Sample not found.", { status: 404 });
  }

  const track = result.track!;
  const audioSource = track.audioFile;

  // 1. Check if the audio source is a Google Drive link / file ID or external URL
  const isDrive = extractGoogleDriveId(audioSource) !== null;
  const isHttp = audioSource.startsWith("http://") || audioSource.startsWith("https://");

  if (isDrive || isHttp) {
    try {
      const rangeHeader = req.headers.get("range");
      const upstreamRes = await fetchGoogleDriveAudioStream(audioSource, rangeHeader);

      const upstreamContentType = upstreamRes.headers.get("content-type") || "";

      // If upstream still returned HTML, file is either private or unavailable
      if (upstreamContentType.includes("text/html")) {
        console.error(
          "Google Drive returned HTML instead of audio stream. Link may be private or invalid:",
          audioSource
        );
        return new NextResponse(
          "Audio preview unavailable: Google Drive file is not accessible or sharing is not set to 'Anyone with the link can view'.",
          { status: 404 }
        );
      }

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        console.warn(`Upstream audio stream responded with status: ${upstreamRes.status}`);
      }

      const responseHeaders = new Headers();

      // Preserve exact audio content-type (e.g. audio/wav, audio/mpeg, etc.)
      responseHeaders.set("Content-Type", upstreamContentType || "audio/mpeg");

      const upstreamContentLength = upstreamRes.headers.get("content-length");
      if (upstreamContentLength) {
        responseHeaders.set("Content-Length", upstreamContentLength);
      }

      const upstreamContentRange = upstreamRes.headers.get("content-range");
      if (upstreamContentRange) {
        responseHeaders.set("Content-Range", upstreamContentRange);
      }

      responseHeaders.set("Accept-Ranges", "bytes");
      responseHeaders.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
      responseHeaders.set("Pragma", "no-cache");
      responseHeaders.set("Expires", "0");
      responseHeaders.set("X-Content-Type-Options", "nosniff");

      let ext = "mp3";
      if (upstreamContentType.includes("wav")) ext = "wav";
      else if (upstreamContentType.includes("mp4") || upstreamContentType.includes("m4a")) ext = "m4a";
      else if (upstreamContentType.includes("flac")) ext = "flac";
      else if (upstreamContentType.includes("aac")) ext = "aac";
      else if (upstreamContentType.includes("ogg")) ext = "ogg";

      responseHeaders.set(
        "Content-Disposition",
        `inline; filename="confidential-sample-${token}.${ext}"`
      );

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    } catch (err) {
      console.error("Google Drive audio streaming error:", err);
      return new NextResponse("Error streaming audio from cloud source.", { status: 500 });
    }
  }

  // 2. Fallback: Local storage provider for legacy uploaded files
  const storage = getAudioStorageProvider();
  const rangeHeader = req.headers.get("range");
  let range: { start?: number; end?: number } | undefined = undefined;

  if (rangeHeader && rangeHeader.startsWith("bytes=")) {
    const parts = rangeHeader.replace("bytes=", "").split("-");
    const start = parts[0] ? parseInt(parts[0], 10) : undefined;
    const end = parts[1] ? parseInt(parts[1], 10) : undefined;
    range = { start, end };
  }

  try {
    const streamResult = await storage.getAudioStream(track.audioFile, range);

    const webStream = (Readable.toWeb
      ? Readable.toWeb(streamResult.stream)
      : new ReadableStream({
          start(controller) {
            streamResult.stream.on("data", (chunk) => controller.enqueue(chunk));
            streamResult.stream.on("end", () => controller.close());
            streamResult.stream.on("error", (err) => controller.error(err));
          },
        })) as ReadableStream<Uint8Array>;

    const headers = new Headers();
    headers.set("Content-Type", streamResult.mimeType);
    headers.set("Content-Length", streamResult.contentLength.toString());
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Content-Disposition",
      `inline; filename="confidential-sample-${token}.mp3"`
    );

    if (streamResult.contentRange) {
      headers.set("Content-Range", streamResult.contentRange);
    }

    return new Response(webStream, {
      status: streamResult.status,
      headers,
    });
  } catch (err) {
    console.error("Audio streaming error:", err);
    return new NextResponse("Error reading audio resource.", { status: 500 });
  }
}
