import { NextResponse } from "next/server";
import { validateToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Accept token from body (preferred) or Authorization header (fallback)
    let token: string | undefined;

    const body = await request.json().catch(() => null);
    if (body?.token) {
      token = body.token;
    } else {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 401 }
      );
    }

    const user = await validateToken(token);

    return NextResponse.json({
      contractor_id: user.contractor_id,
      email: user.email,
      display_name: user.display_name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Auth validation error:", message);
    return NextResponse.json(
      { error: message },
      { status: 401 }
    );
  }
}
