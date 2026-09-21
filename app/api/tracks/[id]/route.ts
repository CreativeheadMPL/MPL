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
    const updates = await req.json();
    const store = DataStore.getInstance();
    const updated = store.updateTrack(params.id, updates);

    if (!updated) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, track: updated });
  } catch (err) {
    console.error("Update track error:", err);
    return NextResponse.json({ error: "Failed to update track" }, { status: 500 });
  }
}
