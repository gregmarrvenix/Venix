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
    .from("time_entries")
    .select(
      "*, contractor:contractors(*), customer:customers(*), project:projects(*)"
    )
    .order("entry_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(100);

  if (contractorId) {
    query = query.eq("contractor_id", contractorId);
  }
  if (customerId) {
    query = query.eq("customer_id", customerId);
  }
  if (from) {
    query = query.gte("entry_date", from);
  }
  if (to) {
    query = query.lte("entry_date", to);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    !body.entry_date ||
    !body.start_time ||
    !body.end_time
  ) {
    return NextResponse.json(
      {
        error:
          "customer_id, project_id, entry_date, start_time, and end_time are required",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      contractor_id: user.contractor_id,
      customer_id: body.customer_id,
      project_id: body.project_id,
      entry_date: body.entry_date,
      start_time: body.start_time,
      end_time: body.end_time,
      description: body.description ?? "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
