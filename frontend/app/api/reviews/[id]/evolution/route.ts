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

    // Get paper memories for evolution analysis
    const papers = await prisma.reviewPaper.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        year: true,
        parsedMemory: true,
      },
    });

    // Return paper data sorted by year for evolution display
    const evolutionData = papers
      .filter(p => p.year)
      .sort((a, b) => (a.year || 0) - (b.year || 0))
      .map(p => ({
        id: p.id,
        title: p.title,
        year: p.year,
        method: p.parsedMemory ? JSON.parse(p.parsedMemory).method || "" : "",
        contribution: p.parsedMemory ? JSON.parse(p.parsedMemory).contribution || "" : "",
      }));

    return NextResponse.json({ data: { papers: evolutionData } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch evolution data";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
