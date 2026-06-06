import { NextRequest, NextResponse } from "next/server";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || "dev-key";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    let endpoint = "";
    switch (action) {
      case "parse":
        endpoint = "/review/parse-paper";
        break;
      case "cluster":
        endpoint = "/review/cluster";
        break;
      case "gaps":
        endpoint = "/review/gaps";
        break;
      case "table":
        endpoint = "/review/table";
        break;
      case "write-section":
        endpoint = "/review/write-section";
        break;
      case "pipeline":
        endpoint = "/review/pipeline/stream";
        break;
      default:
        return NextResponse.json(
          { error: { code: "VALIDATION", message: `Unknown action: ${action}` } },
          { status: 400 }
        );
    }

    // For SSE streaming endpoints, proxy the stream directly
    if (action === "pipeline") {
      const res = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_SERVICE_API_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: { code: "AI_ERROR", message: "Pipeline request failed" } },
          { status: res.status }
        );
      }

      return new Response(res.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const res = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_SERVICE_API_KEY}`,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "AI service error" }));
      throw new Error(err.detail || "AI request failed");
    }

    const json = await res.json();
    return NextResponse.json({ data: json });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI review request failed";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
