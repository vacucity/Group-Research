import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ manuscriptId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { manuscriptId } = await params;

    const manuscript = await prisma.manuscript.findUnique({
      where: { id: manuscriptId },
      include: {
        sections: { orderBy: { orderIndex: "asc" } },
        citations: { orderBy: { orderIndex: "asc" } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!manuscript) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Manuscript not found" } },
        { status: 404 }
      );
    }

    await requireProjectMember(user.id, manuscript.projectId);

    return NextResponse.json({ data: manuscript });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch manuscript";
    if (msg.includes("Forbidden"))
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: msg } },
        { status: 403 }
      );
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ manuscriptId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { manuscriptId } = await params;
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

    const updated = await prisma.manuscript.update({
      where: { id: manuscriptId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.abstract !== undefined && { abstract: body.abstract }),
        ...(body.status !== undefined && { status: body.status }),
      },
      include: {
        sections: { orderBy: { orderIndex: "asc" } },
        citations: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update manuscript";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ manuscriptId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { manuscriptId } = await params;

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

    await prisma.manuscript.delete({ where: { id: manuscriptId } });

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete manuscript";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
