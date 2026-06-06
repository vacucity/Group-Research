import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paperId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId, paperId } = await params;
    await requireReviewMember(user.id, workspaceId);
    const body = await request.json();

    const paper = await prisma.reviewPaper.findUnique({ where: { id: paperId } });
    if (!paper || paper.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Paper not found" } },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.authors !== undefined) data.authors = body.authors;
    if (body.abstract !== undefined) data.abstract = body.abstract;
    if (body.year !== undefined) data.year = body.year;
    if (body.parsedMemory !== undefined) data.parsedMemory = body.parsedMemory;
    if (body.status !== undefined) data.status = body.status;

    const updated = await prisma.reviewPaper.update({
      where: { id: paperId },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update paper";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paperId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId, paperId } = await params;
    await requireReviewMember(user.id, workspaceId);

    const paper = await prisma.reviewPaper.findUnique({
      where: { id: paperId },
    });
    if (!paper || paper.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Paper not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: paper });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch paper";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paperId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId, paperId } = await params;
    await requireReviewMember(user.id, workspaceId);

    const paper = await prisma.reviewPaper.findUnique({ where: { id: paperId } });
    if (!paper || paper.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Paper not found" } },
        { status: 404 }
      );
    }

    await prisma.reviewPaper.delete({ where: { id: paperId } });
    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete paper";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
