import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
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
