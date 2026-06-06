import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId } = await params;
    await requireReviewMember(user.id, workspaceId);

    const clusters = await prisma.topicCluster.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: clusters });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch clusters";
    if (msg.includes("Forbidden"))
      return NextResponse.json({ error: { code: "FORBIDDEN", message: msg } }, { status: 403 });
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId } = await params;
    await requireReviewMember(user.id, workspaceId);

    // Fetch all papers in the workspace
    const papers = await prisma.reviewPaper.findMany({
      where: { workspaceId },
    });

    if (papers.length < 3) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Need at least 3 papers to cluster" } },
        { status: 400 }
      );
    }

    // Build paper context for AI
    const papersCtx = papers.map((p) => ({
      title: p.title,
      abstract: p.abstract?.slice(0, 300) || "",
      keywords: p.parsedMemory ? JSON.parse(p.parsedMemory).keywords?.join(", ") || "" : "",
    }));

    // Call AI service
    const aiRes = await fetch(`${process.env.AI_SERVICE_URL}/review/cluster`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({ papers: JSON.stringify(papersCtx) }),
    });

    if (!aiRes.ok) {
      throw new Error("AI clustering failed");
    }

    const aiJson = await aiRes.json();
    const clustersRaw = parseAIJson(aiJson.clusters || "[]");

    // Delete existing clusters and create new ones
    await prisma.topicCluster.deleteMany({ where: { workspaceId } });

    const created = [];
    for (const clusterRaw of clustersRaw) {
      const c = clusterRaw as Record<string, unknown>;
      const paperTitles = (c.paper_titles as string[]) || [];
      const paperIds = papers
        .filter((p) => (paperTitles as string[]).some((t: string) => t.toLowerCase() === p.title.toLowerCase()))
        .map((p) => p.id);

      const clusterRecord = await prisma.topicCluster.create({
        data: {
          workspaceId,
          name: (c.name as string) || "Unnamed",
          description: (c.description as string) || null,
          color: (c.color as string) || "#6366f1",
          paperIds: JSON.stringify(paperIds),
        },
      });
      created.push(clusterRecord);
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to cluster papers";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

function parseAIJson(raw: string): Array<Record<string, unknown>> {
  try {
    // Try direct parse
    return JSON.parse(raw) as Array<Record<string, unknown>>;
  } catch {
    // Try to extract JSON array from markdown code blocks
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]) as Array<Record<string, unknown>>;
    // Try to find array brackets
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]) as Array<Record<string, unknown>>;
    return [];
  }
}
