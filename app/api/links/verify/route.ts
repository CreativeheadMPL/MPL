import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { DataStore } from "@/lib/data/store";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    const store = DataStore.getInstance();
    const result = store.verifyLinkAccess(token, password);

    if (result.allowed) {
      // Set secure access cookie for this specific token
      const cookieStore = cookies();
      const isSecure =
        process.env.COOKIE_SECURE === "true" ||
        (process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false);

      cookieStore.set(`mp_pass_${token}`, password, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 86400, // 24 hours
      });

      return NextResponse.json({ success: true });
    }

    if (result.reason === "REVOKED") {
      return NextResponse.json(
        { error: "Access has been revoked by Motion Pulse." },
        { status: 403 }
      );
    }

    if (result.reason === "EXPIRED") {
      return NextResponse.json(
        { error: "This private preview link has expired." },
        { status: 410 }
      );
    }

    return NextResponse.json(
      { error: "Incorrect confidential password" },
      { status: 401 }
    );
  } catch (err) {
    console.error("Password verification error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
