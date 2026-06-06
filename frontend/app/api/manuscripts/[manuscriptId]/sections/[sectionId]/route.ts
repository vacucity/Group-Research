import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ manuscriptId: string; sectionId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { manuscriptId, sectionId } = await params;
    const body = await request.json();

    const manuscript = await prisma.manuscript.findUnique({
      where: { id: manuscriptId },
    });
    if (!manuscript) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Manuscript not found" } },
        { status: 404 }
      );
    }
    await requireProjectMember(user.id, manuscript.projectId);

    const section = await prisma.manuscriptSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.manuscriptId !== manuscriptId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Section not found" } },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.content !== undefined)
      data.content = typeof body.content === "string" ? body.content : JSON.stringify(body.content);
    if (body.sectionType !== undefined) data.sectionType = body.sectionType;
    if (body.status !== undefined) data.status = body.status;
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo;
    if (body.orderIndex !== undefined) data.orderIndex = body.orderIndex;
    if (body.contentMode !== undefined) data.contentMode = body.contentMode;
    if (body.latexContent !== undefined) data.latexContent = body.latexContent;

    const updated = await prisma.manuscriptSection.update({
      where: { id: sectionId },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update section";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ manuscriptId: string; sectionId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { manuscriptId, sectionId } = await params;

    const manuscript = await prisma.manuscript.findUnique({
      where: { id: manuscriptId },
    });
    if (!manuscript) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Manuscript not found" } },
        { status: 404 }
      );
    }
    await requireProjectMember(user.id, manuscript.projectId);

    const section = await prisma.manuscriptSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.manuscriptId !== manuscriptId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Section not found" } },
        { status: 404 }
      );
    }

    await prisma.manuscriptSection.delete({ where: { id: sectionId } });

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete section";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
