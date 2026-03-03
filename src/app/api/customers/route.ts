import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    await getAuthUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ name: body.name })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
