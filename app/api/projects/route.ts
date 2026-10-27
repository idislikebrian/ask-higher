import { NextResponse } from "next/server";
import { findEligibleProjectNameMatches } from "@/lib/projects";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query") || "";
  if (query.trim().length < 2) return NextResponse.json({ projects: [] });
  const projects = await findEligibleProjectNameMatches(query);
  return NextResponse.json({ projects });
}
