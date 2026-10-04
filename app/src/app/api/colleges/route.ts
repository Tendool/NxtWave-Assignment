import { NextResponse, type NextRequest } from "next/server";
import { searchColleges } from "@/db/queries";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchColleges(q);
  // The list changes only when an admin approves a college, so a short shared cache is safe.
  return NextResponse.json(results, { headers: { "cache-control": "public, max-age=60, s-maxage=300" } });
}
