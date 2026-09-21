import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { DataStore } from "@/lib/data/store";
import { LinkStatus } from "@/lib/data/types";

export async function PATCH(req: NextRequest) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { linkId, status, expiresAt } = await req.json();

    if (!linkId || !status) {
      return NextResponse.json(
        { error: "linkId and status are required" },
        { status: 400 }
      );
    }

    const store = DataStore.getInstance();
    const updateData: { status: LinkStatus; expiresAt?: string | null } = {
      status: status as LinkStatus,
    };
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt;
    }
    const updated = await store.updateLink(linkId, updateData);

    if (!updated) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, link: updated });
  } catch (err) {
    console.error("Update link error:", err);
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { trackId, password, expiresAt } = await req.json();

    if (!trackId) {
      return NextResponse.json({ error: "trackId is required" }, { status: 400 });
    }

    const store = DataStore.getInstance();
    const newLink = await store.createLink({
      trackId,
      password,
      expiresAt: expiresAt || null,
    });

    return NextResponse.json({ success: true, link: newLink });
  } catch (err) {
    console.error("Create link error:", err);
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }
}
