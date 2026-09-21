import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { DataStore } from "@/lib/data/store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = DataStore.getInstance();
  const deleted = await store.deleteTrack(params.id);

  if (!deleted) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.artist !== undefined) updates.artist = body.artist;
    if (body.composer !== undefined) updates.composer = body.composer;
    if (body.project !== undefined) updates.project = body.project;
    if (body.description !== undefined) updates.description = body.description;
    if (body.artwork !== undefined) updates.artwork = body.artwork;
    if (body.audioFile !== undefined) updates.audioFile = body.audioFile;
    if (body.googleDriveUrl !== undefined) updates.audioFile = body.googleDriveUrl;
    if (body.duration !== undefined && !isNaN(Number(body.duration))) {
      updates.duration = Math.round(Number(body.duration));
    }

    const store = DataStore.getInstance();
    const updated = await store.updateTrack(params.id, updates);

    if (!updated) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, track: updated });
  } catch (err) {
    console.error("Update track error:", err);
    return NextResponse.json({ error: "Failed to update track" }, { status: 500 });
  }
}
