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

    // Fetch papers for conflict analysis
    const papers = await prisma.reviewPaper.findMany({
      where: { workspaceId, status: "parsed" },
      select: {
        id: true,
        title: true,
        parsedMemory: true,
      },
    });

    // Run simple conflict detection: compare method/metric claims
    const conflicts: Array<{
      title: string;
      paperA: string;
      paperB: string;
      detail: string;
      severity: string;
    }> = [];

    const memories = papers
      .filter(p => p.parsedMemory)
      .map(p => ({
        title: p.title,
        memory: JSON.parse(p.parsedMemory!),
      }));

    // Simple heuristic: check for different methods claiming best performance
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const a = memories[i];
        const b = memories[j];
        if (
          a.memory.method &&
          b.memory.method &&
          a.memory.method !== b.memory.method &&
          a.memory.metric &&
          b.memory.metric
        ) {
          conflicts.push({
            title: `Method comparison: ${a.title.substring(0, 40)} vs ${b.title.substring(0, 40)}`,
            paperA: a.title,
            paperB: b.title,
            detail: `${a.title}: ${a.memory.method} (${a.memory.metric}) | ${b.title}: ${b.memory.method} (${b.memory.metric})`,
            severity: "low",
          });
        }
      }
    }

    return NextResponse.json({ data: conflicts.slice(0, 20) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch conflicts";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
