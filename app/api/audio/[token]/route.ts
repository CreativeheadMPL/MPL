import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { DataStore } from "@/lib/data/store";
import { getAudioStorageProvider } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const store = DataStore.getInstance();

  // Ensure demo seed runs if store is empty
  await store.seedDemoTracks();

  // Check link access
  const accessCookie = cookies().get(`mp_pass_${token}`)?.value;
  const result = store.verifyLinkAccess(token, accessCookie);

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
  const storage = getAudioStorageProvider();

  // Parse HTTP Range header if present
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

    // Convert Node.js stream to Web ReadableStream
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
