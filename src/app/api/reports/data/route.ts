import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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

  const isAllCustomers = body.customer_id === "__all__";

  let query = supabase
    .from("time_entries")
    .select("*, contractor:contractors(*), customer:customers(*), project:projects(*)")
    .gte("entry_date", body.from)
    .lte("entry_date", body.to)
    .order("entry_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (!isAllCustomers) {
    query = query.eq("customer_id", body.customer_id);
  }

  const { data: entries, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: entries ?? [] });
}
