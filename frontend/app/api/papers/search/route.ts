import { NextRequest, NextResponse } from "next/server";
import { searchPapers } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Search query required" } },
        { status: 400 }
      );
    }

    const result = await searchPapers(query);
    return NextResponse.json({ data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Paper search failed";
    return NextResponse.json(
      { error: { code: "SEARCH_ERROR", message: msg } },
      { status: 503 }
    );
  }
}
