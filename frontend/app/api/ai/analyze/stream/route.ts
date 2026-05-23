import { NextRequest } from "next/server";
import { streamAnalyze } from "@/lib/ai-client";
import { analyzeRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }), { status: 400 });
    }

    const res = await streamAnalyze(parsed.data.text, parsed.data.paper_context);
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: { code: "AI_ERROR", message: "Streaming failed" } }), { status: 503 });
  }
}
