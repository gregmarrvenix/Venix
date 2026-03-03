import { NextResponse } from "next/server";
import { validateToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const user = await validateToken(token);

    return NextResponse.json({
      contractor_id: user.contractor_id,
      email: user.email,
      display_name: user.display_name,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
