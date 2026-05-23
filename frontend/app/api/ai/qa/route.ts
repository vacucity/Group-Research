import { NextRequest, NextResponse } from "next/server";
import { askQuestion } from "@/lib/ai-client";
import { qaRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = qaRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 400 });
    }

    const result = await askQuestion(parsed.data.question, parsed.data.context);
    return NextResponse.json({ data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Q&A failed";
    return NextResponse.json({ error: { code: "AI_ERROR", message: msg } }, { status: 503 });
  }
}
