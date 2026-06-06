import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: projectId } = await params;
    await requireProjectMember(user.id, projectId);

    const manuscripts = await prisma.manuscript.findMany({
      where: { projectId },
      include: {
        _count: { select: { sections: true, citations: true } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: manuscripts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch manuscripts";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: projectId } = await params;
    await requireProjectMember(user.id, projectId);

    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Title is required" } },
        { status: 400 }
      );
    }

    const manuscript = await prisma.manuscript.create({
      data: {
        title: title.trim(),
        abstract: body.abstract?.trim() || null,
        projectId,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ data: manuscript }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create manuscript";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
