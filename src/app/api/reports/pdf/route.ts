import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getAuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { generateTimeReport } from "@/lib/pdf-generator";

let cachedLogoPng: string | null = null;

async function getLogoPng(): Promise<string | undefined> {
  if (cachedLogoPng) return cachedLogoPng;

  try {
    const sharp = (await import("sharp")).default;
    const logoPath = path.join(process.cwd(), "public", "logo.webp");
    if (!fs.existsSync(logoPath)) return undefined;

    const pngBuffer = await sharp(logoPath).png().toBuffer();
    cachedLogoPng = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    return cachedLogoPng;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.customer_id || !body.from || !body.to) {
    return NextResponse.json(
      { error: "customer_id, from, and to are required" },
      { status: 400 }
    );
  }

  // Get customer name
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("name")
    .eq("id", body.customer_id)
    .single();

  if (customerError || !customer) {
    return NextResponse.json(
      { error: "Customer not found" },
      { status: 404 }
    );
  }

  // Query time entries for the customer within date range
  const { data: entries, error: entriesError } = await supabase
    .from("time_entries")
    .select("*, contractor:contractors(*), project:projects(*)")
    .eq("customer_id", body.customer_id)
    .gte("entry_date", body.from)
    .lte("entry_date", body.to)
    .order("entry_date")
    .order("start_time");

  if (entriesError) {
    return NextResponse.json(
      { error: entriesError.message },
      { status: 500 }
    );
  }

  const logoPng = await getLogoPng();

  const pdfBytes = generateTimeReport({
    customerName: customer.name,
    periodLabel: `${body.from} — ${body.to}`,
    entries: entries ?? [],
    groupByProject: body.group_by_project ?? false,
    logoPng,
  });

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="time-report-${body.from}-${body.to}.pdf"`,
    },
  });
}
