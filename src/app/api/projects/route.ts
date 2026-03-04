import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customer_id");
  const includeInactive = searchParams.get("include_inactive") === "true";

  const select = includeInactive
    ? "*, customer:customers(*)"
    : "*, customer:customers!inner(*)";

  let query = supabase
    .from("projects")
    .select(select)
    .order("name");

  if (!includeInactive) {
    query = query.eq("is_active", true).eq("customer.is_active", true);
  }
  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("DB error:", error.message);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  // Sort by customer name then project name
  const sorted = (data ?? []).sort((a, b) => {
    const custA = a.customer?.name ?? "";
    const custB = b.customer?.name ?? "";
    const custCompare = custA.localeCompare(custB);
    if (custCompare !== 0) return custCompare;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(sorted);
}

export async function POST(request: Request) {
  try {
    await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.customer_id || !body.name) {
    return NextResponse.json(
      { error: "customer_id and name are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({ customer_id: body.customer_id, name: body.name })
    .select()
    .single();

  if (error) {
    console.error("DB error:", error.message);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
