import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { ImportEntry } from "@/lib/harvest-types";

const BATCH_SIZE = 500;

export async function POST(request: Request) {
  try {
    await getAuthUser(request);
  } catch {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { entries?: ImportEntry[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { entries } = body;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json(
      { error: "entries array is required" },
      { status: 400 }
    );
  }

  // Validate all entries have required fields
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.contractor_id || !e.customer_id || !e.project_id || !e.entry_date || !e.start_time || !e.end_time) {
      return NextResponse.json(
        { error: `Entry ${i} missing required fields` },
        { status: 400 }
      );
    }
  }

  let imported = 0;
  const errors: string[] = [];

  // Batch insert in chunks
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("time_entries").insert(
      batch.map((e) => ({
        contractor_id: e.contractor_id,
        customer_id: e.customer_id,
        project_id: e.project_id,
        entry_date: e.entry_date,
        start_time: e.start_time,
        end_time: e.end_time,
        break_minutes: e.break_minutes ?? 0,
        description: e.description || "",
      }))
    );

    if (error) {
      console.error("DB error:", error.message);
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed`);
    } else {
      imported += batch.length;
    }
  }

  return NextResponse.json({
    imported,
    total: entries.length,
    ...(errors.length > 0 && { errors }),
  });
}
