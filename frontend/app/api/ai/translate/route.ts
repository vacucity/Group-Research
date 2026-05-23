import { NextRequest, NextResponse } from "next/server";
import { translateText, streamTranslate } from "@/lib/ai-client";
import { translateRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = translateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 400 });
    }

    const result = await translateText(parsed.data.text, parsed.data.targetLang);
    return NextResponse.json({ data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Translation failed";
    return NextResponse.json({ error: { code: "AI_ERROR", message: msg } }, { status: 503 });
  }
}
