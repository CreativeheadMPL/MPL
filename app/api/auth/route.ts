import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession, isAdminAuthenticated, setAdminSession } from "@/lib/auth/session";

const EXPECTED_EMAIL = (process.env.ADMIN_EMAIL || "admin@motionpulse.local").toLowerCase();
const EXPECTED_PASSWORD = process.env.ADMIN_PASSWORD || "motionpulse-demo";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json({ authenticated });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (
      email.trim().toLowerCase() === EXPECTED_EMAIL &&
      password.trim() === EXPECTED_PASSWORD
    ) {
      await setAdminSession(email.trim().toLowerCase());
      return NextResponse.json({ success: true, message: "Authenticated successfully" });
    }

    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
