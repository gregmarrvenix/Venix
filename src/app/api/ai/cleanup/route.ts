import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple per-user rate limiting: max 20 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  let user;
  try {
    user = await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(user.contractor_id)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment." },
      { status: 429 }
    );
  }

  const body = await request.json();
  if (!body.text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Limit input size to prevent abuse
  if (body.text.length > 2000) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Clean up this voice-to-text transcription for a work timesheet description. Fix grammar, remove filler words (um, uh, like), make it concise and professional. Ensure the first letter is capitalised and proper nouns are capitalised. Return only the cleaned text.",
        },
        { role: "user", content: body.text },
      ],
      temperature: 0.3,
    });

    const cleanedText = completion.choices[0]?.message?.content ?? body.text;

    return NextResponse.json({ text: cleanedText });
  } catch {
    return NextResponse.json(
      { error: "AI cleanup failed" },
      { status: 500 }
    );
  }
}
