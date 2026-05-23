import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const projectId = (await params).id;

    const ideas = await prisma.researchIdea.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { candidatePapers: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: ideas });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch ideas" } },
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
    const projectId = (await params).id;
    const body = await request.json();
    const { rawInput, structuredOutput } = body;

    if (!rawInput) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Raw input required" } },
        { status: 400 }
      );
    }

    const idea = await prisma.researchIdea.create({
      data: {
        projectId,
        userId: user.id,
        rawInput,
        structuredOutput: structuredOutput || null,
      },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { candidatePapers: true } },
      },
    });

    return NextResponse.json({ data: idea });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to create idea" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get("id");
    if (!ideaId) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Idea ID required" } },
        { status: 400 }
      );
    }

    await prisma.researchIdea.delete({ where: { id: ideaId } });
    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to delete idea" } },
      { status: 500 }
    );
  }
}
