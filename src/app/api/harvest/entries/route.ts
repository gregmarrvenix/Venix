import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import type {
  HarvestTimeEntry,
  HarvestTimeEntriesResponse,
} from "@/lib/harvest-types";

export async function POST(request: Request) {
  try {
    await getAuthUser(request);
  } catch (err) {
    console.error("Harvest entries auth error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, accountId, from, to } = await request.json();

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
      const url = `https://api.harvestapp.com/v2/time_entries?from=${from}&to=${to}&per_page=2000&page=${page}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Harvest-Account-Id": accountId,
          "User-Agent": "VenixTimeTracker",
        },
      });

      if (!res.ok) {
        const body = await res.text();
        return NextResponse.json(
          { error: `Harvest API error (${res.status}): ${body}` },
          { status: res.status }
        );
      }

      const data: HarvestTimeEntriesResponse = await res.json();
      allEntries.push(...data.time_entries);

      if (!data.next_page) break;
      page = data.next_page;
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch from Harvest: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ entries: allEntries, total: allEntries.length });
}
