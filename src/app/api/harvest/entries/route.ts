import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import type {
  HarvestTimeEntry,
  HarvestTimeEntriesResponse,
} from "@/lib/harvest-types";

export async function POST(request: Request) {
  // Clone the request so we can read headers for auth and body separately
  let body: { token?: string; accountId?: string; from?: string; to?: string };

  try {
    await getAuthUser(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown auth error";
    console.error("Harvest entries auth failed:", message);
    return NextResponse.json(
      { error: `Auth failed: ${message}` },
      { status: 401 }
    );
  }

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { token, accountId, from, to } = body;

  if (!token || !accountId || !from || !to) {
    return NextResponse.json(
      { error: "token, accountId, from, and to are required" },
      { status: 400 }
    );
  }

  const allEntries: HarvestTimeEntry[] = [];
  let page = 1;

  try {
    while (true) {
      const url = `https://api.harvestapp.com/v2/time_entries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&per_page=2000&page=${page}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Harvest-Account-Id": accountId,
          "User-Agent": "VenixTimeTracker",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { error: `Harvest API error (${res.status}): ${text}` },
          { status: 502 }
        );
      }

      const data: HarvestTimeEntriesResponse = await res.json();
      allEntries.push(...data.time_entries);

      if (!data.next_page) break;
      page = data.next_page;
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Harvest fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ entries: allEntries, total: allEntries.length });
}
