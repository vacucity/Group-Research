import { NextRequest, NextResponse } from "next/server";
import { generateFlashcards } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysis } = body;
    if (!analysis || analysis.length < 10) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Analysis text is required" } },
        { status: 400 }
      );
    }

    const result = await generateFlashcards(analysis);
    return NextResponse.json({ data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Flashcard generation failed";
    return NextResponse.json(
      { error: { code: "AI_ERROR", message: msg } },
      { status: 503 }
    );
  }
}
