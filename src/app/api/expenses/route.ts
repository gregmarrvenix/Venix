import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  let user;
  try {
    user = await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contractorId = searchParams.get("contractor_id") ?? user.contractor_id;
  const customerId = searchParams.get("customer_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("expenses")
    .select(
      "*, contractor:contractors(*), customer:customers(*), project:projects(*)"
    )
    .order("expense_date", { ascending: false })
    .limit(100);

  if (contractorId) {
    query = query.eq("contractor_id", contractorId);
  }
  if (customerId) {
    query = query.eq("customer_id", customerId);
  }
  if (from) {
    query = query.gte("expense_date", from);
  }
  if (to) {
    query = query.lte("expense_date", to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("DB error:", error.message);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  let user;
  try {
    user = await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (
    !body.customer_id ||
    !body.project_id ||
    !body.expense_date ||
    !body.amount
  ) {
    return NextResponse.json(
      {
        error:
          "customer_id, project_id, expense_date, and amount are required",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      contractor_id: user.contractor_id,
      customer_id: body.customer_id,
      project_id: body.project_id,
      expense_date: body.expense_date,
      amount: body.amount,
      description: body.description ?? "",
      is_billable: body.is_billable ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("DB error:", error.message);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
