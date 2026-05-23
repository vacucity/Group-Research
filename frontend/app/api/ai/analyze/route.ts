import { NextRequest, NextResponse } from "next/server";
import { analyzeText } from "@/lib/ai-client";
import { analyzeRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 400 });
    }

    const result = await analyzeText(parsed.data.text, parsed.data.paper_context);
    return NextResponse.json({ data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: { code: "AI_ERROR", message: msg } }, { status: 503 });
  }
}
