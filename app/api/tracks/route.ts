import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { DataStore } from "@/lib/data/store";
import { getAudioStorageProvider } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = DataStore.getInstance();
  await store.seedDemoTracks();
  const tracksWithLinks = store.getTracksWithLinks();
  return NextResponse.json(tracksWithLinks);
}

export async function POST(req: NextRequest) {
  // Verify admin authentication
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const artist = formData.get("artist") as string;
    const composer = (formData.get("composer") as string) || "";
    const project = (formData.get("project") as string) || "";
    const description = (formData.get("description") as string) || "";
    const artworkPreset = (formData.get("artwork") as string) || "/artwork/default.svg";
    const customArtworkFile = formData.get("customArtwork") as File | null;
    const audioFile = formData.get("audio") as File | null;
    const password = (formData.get("password") as string) || "";
    const expiryOption = (formData.get("expiryOption") as string) || "never";
    const customExpiry = formData.get("customExpiry") as string | null;

    if (!title || !artist) {
      return NextResponse.json(
        { error: "Track title and artist are required." },
        { status: 400 }
      );
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: "An audio file (MP3, WAV, M4A, AAC, FLAC) is required." },
        { status: 400 }
      );
    }

    // Handle artwork: either custom uploaded file or preset SVG
    let finalArtwork = artworkPreset;
    if (customArtworkFile && customArtworkFile.size > 0) {
      const artBuffer = Buffer.from(await customArtworkFile.arrayBuffer());
      const artExt = path.extname(customArtworkFile.name).toLowerCase() || ".png";
      const artName = `art-${uuidv4()}${artExt}`;
      const uploadDir = path.join(process.cwd(), "public", "artwork", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, artName), artBuffer);
      finalArtwork = `/artwork/uploads/${artName}`;
    }

    // Upload audio file to AudioStorageProvider (stored in private storage/audio)
    const audioBytes = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(audioBytes);
    const storage = getAudioStorageProvider();
    const uploadedInfo = await storage.upload(
      audioBuffer,
      audioFile.name,
      audioFile.type
    );

    // Calculate approximate duration based on size or estimate 3 mins (180s)
    let estimatedDuration = 180;
    const durationInput = formData.get("duration");
    if (durationInput && !isNaN(Number(durationInput))) {
      estimatedDuration = Math.round(Number(durationInput));
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
    const track = store.createTrack({
      title: title.trim(),
      artist: artist.trim(),
      composer: composer.trim() || undefined,
      project: project.trim() || undefined,
      description: description.trim() || undefined,
      artwork: finalArtwork,
      audioFile: uploadedInfo.key,
      duration: estimatedDuration,
    });

    const link = store.createLink({
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
    return NextResponse.json(
      { error: "Failed to create track and listening link." },
      { status: 500 }
    );
  }
}
