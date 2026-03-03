import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const DEFAULT_PROJECT = "Ad-Hoc IT Support";

export async function POST(request: Request) {
  try {
    await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all active customers
  const { data: customers, error: custError } = await supabase
    .from("customers")
    .select("id, name")
    .eq("is_active", true);

  if (custError) {
    return NextResponse.json({ error: custError.message }, { status: 500 });
  }

  // Get customers that already have the default project
  const { data: existing, error: projError } = await supabase
    .from("projects")
    .select("customer_id")
    .eq("name", DEFAULT_PROJECT);

  if (projError) {
    return NextResponse.json({ error: projError.message }, { status: 500 });
  }

  const hasProject = new Set(existing?.map((p) => p.customer_id));
  const missing = (customers ?? []).filter((c) => !hasProject.has(c.id));

  if (missing.length === 0) {
    return NextResponse.json({ created: 0, message: "All customers already have the project" });
  }

  const { error: insertError } = await supabase
    .from("projects")
    .insert(missing.map((c) => ({ customer_id: c.id, name: DEFAULT_PROJECT })));

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    created: missing.length,
    customers: missing.map((c) => c.name),
  });
}
