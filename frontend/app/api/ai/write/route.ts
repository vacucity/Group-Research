import { NextRequest, NextResponse } from "next/server";
import {
  generateOutline,
  writeSection,
  suggestCitations,
  detectMissingCitations,
} from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "outline": {
        const result = await generateOutline(
          params.idea || "",
          params.literature || "",
          params.venue || "General Conference / Journal",
          params.language || "Chinese"
        );
        return NextResponse.json({ data: result });
      }

      case "section": {
        const result = await writeSection({
          section_title: params.section_title || "",
          section_type: params.section_type || "body",
          action: params.write_action || "generate",
          title: params.title || "",
          abstract: params.abstract || "",
          context: params.context || "",
          literature: params.literature || "",
          existing_content: params.existing_content || "",
          language: params.language || "Chinese",
        });
        return NextResponse.json({ data: result });
      }

      case "citations": {
        const result = await suggestCitations(
          params.text || "",
          params.literature || "No literature provided.",
          params.limit || 5
        );
        return NextResponse.json({ data: result });
      }

      case "missing": {
        const result = await detectMissingCitations(
          params.text || "",
          params.existing_citations || ""
        );
        return NextResponse.json({ data: result });
      }

      default:
        return NextResponse.json(
          { error: { code: "VALIDATION", message: `Unknown action: ${action}` } },
          { status: 400 }
        );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI write request failed";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
