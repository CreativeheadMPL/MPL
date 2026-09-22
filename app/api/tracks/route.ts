import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { DataStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = DataStore.getInstance();
  const tracksWithLinks = await store.getTracksWithLinks();
  return NextResponse.json(tracksWithLinks);
}

export async function POST(req: NextRequest) {
  // Verify admin authentication
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let title = "";
    let artist = "";
    let composer = "";
    let project = "";
    let description = "";
    let artwork = "/artwork/default.svg";
    let audioUrl = "";
    let duration = 180;
    let password = "";
    let expiryOption = "never";
    let customExpiry: string | null = null;
    let customArtworkFile: File | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      title = body.title || "";
      artist = body.artist || "";
      composer = body.composer || "";
      project = body.project || "";
      description = body.description || "";
      artwork = body.artwork || "/artwork/default.svg";
      audioUrl = body.googleDriveUrl || body.audioUrl || body.audioFile || "";
      if (body.duration && !isNaN(Number(body.duration))) {
        duration = Math.round(Number(body.duration));
      }
      password = body.password || "";
      expiryOption = body.expiryOption || "never";
      customExpiry = body.customExpiry || null;
    } else {
      const formData = await req.formData();
      title = (formData.get("title") as string) || "";
      artist = (formData.get("artist") as string) || "";
      composer = (formData.get("composer") as string) || "";
      project = (formData.get("project") as string) || "";
      description = (formData.get("description") as string) || "";
      artwork = (formData.get("artwork") as string) || "/artwork/default.svg";
      audioUrl =
        (formData.get("googleDriveUrl") as string) ||
        (formData.get("audioUrl") as string) ||
        (formData.get("audioFile") as string) ||
        "";
      const durInput = formData.get("duration");
      if (durInput && !isNaN(Number(durInput))) {
        duration = Math.round(Number(durInput));
      }
      password = (formData.get("password") as string) || "";
      expiryOption = (formData.get("expiryOption") as string) || "never";
      customExpiry = formData.get("customExpiry") as string | null;
      customArtworkFile = formData.get("customArtwork") as File | null;
    }

    if (!title.trim() || !artist.trim()) {
      return NextResponse.json(
        { error: "Track title and artist are required." },
        { status: 400 }
      );
    }

    if (!audioUrl.trim()) {
      return NextResponse.json(
        { error: "A Google Drive audio link or stream URL is required." },
        { status: 400 }
      );
    }

    // Handle custom uploaded artwork in memory as base64 Data URL (serverless safe, no disk write)
    let finalArtwork = artwork;
    if (customArtworkFile && customArtworkFile.size > 0) {
      const artBuffer = Buffer.from(await customArtworkFile.arrayBuffer());
      const mimeType = customArtworkFile.type || "image/jpeg";
      finalArtwork = `data:${mimeType};base64,${artBuffer.toString("base64")}`;
    }

    // Calculate expiration timestamp
    let expiresAt: string | null = null;
    const now = Date.now();
    if (expiryOption === "24h") {
      expiresAt = new Date(now + 24 * 3600 * 1000).toISOString();
    } else if (expiryOption === "7d") {
      expiresAt = new Date(now + 7 * 24 * 3600 * 1000).toISOString();
    } else if (expiryOption === "30d") {
      expiresAt = new Date(now + 30 * 24 * 3600 * 1000).toISOString();
    } else if (expiryOption === "custom" && customExpiry) {
      expiresAt = new Date(customExpiry).toISOString();
    }

    const store = DataStore.getInstance();
    const track = await store.createTrack({
      title: title.trim(),
      artist: artist.trim(),
      composer: composer.trim() || undefined,
      project: project.trim() || undefined,
      description: description.trim() || undefined,
      artwork: finalArtwork,
      audioFile: audioUrl.trim(),
      duration: duration || 180,
    });

    const link = await store.createLink({
      trackId: track.id,
      password: password.trim() || undefined,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      track,
      link,
    });
  } catch (err) {
    console.error("Create track error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to create track and private listening link.", details: msg },
      { status: 500 }
    );
  }
}
