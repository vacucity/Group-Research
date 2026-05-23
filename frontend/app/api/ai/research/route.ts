import { NextRequest, NextResponse } from "next/server";
import { structureIdea, generateReviewOutline } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, idea, papers, language } = body;

    if (!idea || idea.length < 3) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Research idea is required" } },
        { status: 400 }
      );
    }

    if (action === "structure") {
      const result = await structureIdea(idea, language || "Chinese");
      return NextResponse.json({ data: result });
    }

    if (action === "outline") {
      const result = await generateReviewOutline(
        idea,
        papers || "",
        language || "Chinese"
      );
      return NextResponse.json({ data: result });
    }

    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid action" } },
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Research AI failed";
    return NextResponse.json(
      { error: { code: "AI_ERROR", message: msg } },
      { status: 503 }
    );
  }
}
