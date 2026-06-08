import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || "dev-key";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId, sid: sectionId } = await params;
    await requireReviewMember(user.id, workspaceId);

    const section = await prisma.reviewSection.findUnique({ where: { id: sectionId } });
    if (!section || section.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Section not found" } },
        { status: 404 }
      );
    }

    // Get workspace context for regeneration
    const workspace = await prisma.reviewWorkspace.findUnique({
      where: { id: workspaceId },
      include: {
        papers: { where: { status: "parsed" }, select: { title: true, parsedMemory: true } },
        clusters: true,
      },
    });

    const body = await request.json();
    const instruction = body.instruction || "regenerate";

    // Build papers context
    const papersCtx = (workspace?.papers || []).map(p => {
      const mem = p.parsedMemory ? JSON.parse(p.parsedMemory) : {};
      return `${p.title}: ${mem.contribution || ""} | Method: ${mem.method || ""}`;
    }).join("\n");

    const res = await fetch(`${AI_SERVICE_URL}/review/write-section`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        review_title: workspace?.name || "Literature Review",
        section_title: section.title,
        section_type: "body",
        papers_context: papersCtx,
        language: "Chinese",
      }),
    });

    if (!res.ok) {
      throw new Error("AI service failed");
    }

    const aiJson = await res.json();

    // Update the section
    const updated = await prisma.reviewSection.update({
      where: { id: sectionId },
      data: { content: aiJson.content || "", status: "drafting" },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to regenerate section";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
