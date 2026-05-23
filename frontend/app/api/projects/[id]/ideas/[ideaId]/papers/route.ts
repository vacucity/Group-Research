import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ideaId: string }> }
) {
  try {
    const { ideaId } = await params;
    const papers = await prisma.candidatePaper.findMany({
      where: { ideaId },
      orderBy: [{ isSaved: "desc" }, { relevanceScore: "desc" }],
    });
    return NextResponse.json({ data: papers });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch papers" } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ideaId: string }> }
) {
  try {
    const { ideaId } = await params;
    const body = await request.json();
    const { papers } = body;

    if (!papers || !Array.isArray(papers)) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Papers array required" } },
        { status: 400 }
      );
    }

    const created = await Promise.all(
      papers.map((p: any) =>
        prisma.candidatePaper.create({
          data: {
            ideaId,
            title: p.title,
            authors: p.authors || null,
            abstract: p.abstract || null,
            year: p.year || null,
            citationCount: p.citationCount || null,
            source: p.source || "semantic_scholar",
            sourceId: p.sourceId || null,
            relevanceScore: p.relevanceScore || null,
          },
        })
      )
    );

    return NextResponse.json({ data: created });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to save papers" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ideaId: string }> }
) {
  try {
    const body = await request.json();
    const { paperId, isSaved, userNote } = body;

    if (!paperId) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "paperId required" } },
        { status: 400 }
      );
    }

    const updated = await prisma.candidatePaper.update({
      where: { id: paperId },
      data: {
        ...(isSaved !== undefined ? { isSaved } : {}),
        ...(userNote !== undefined ? { userNote } : {}),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to update paper" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ideaId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get("id");
    if (!paperId) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Paper ID required" } },
        { status: 400 }
      );
    }

    await prisma.candidatePaper.delete({ where: { id: paperId } });
    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to delete paper" } },
      { status: 500 }
    );
  }
}
