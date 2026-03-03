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
    .from("expenses")
    .select("*, contractor:contractors(*), customer:customers(*), project:projects(*)")
    .gte("expense_date", body.from)
    .lte("expense_date", body.to)
    .order("expense_date", { ascending: false })
    .limit(2000);

  if (!isAllCustomers) {
    query = query.eq("customer_id", body.customer_id);
  }

  const { data: expenses, error } = await query;

  if (error) {
    console.error("DB error:", error.message);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json({ expenses: expenses ?? [] });
}
