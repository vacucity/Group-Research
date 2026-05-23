import { NextRequest, NextResponse } from "next/server";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || "dev-key";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${AI_SERVICE_URL}/chart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_SERVICE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "AI service error" }));
      return NextResponse.json({ error: { code: "AI_ERROR", message: err.detail || "Failed" } }, { status: 503 });
    }
    const data = await res.json();
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: { code: "AI_ERROR", message: String(e) } }, { status: 503 });
  }
}
