import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember, requireProjectOwner } from "@/lib/auth-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    await requireProjectMember(user.id, id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { papers: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        papers: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!project) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch project";
    if (msg.includes("Unauthorized")) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: msg } }, { status: 401 });
    if (msg.includes("Forbidden")) return NextResponse.json({ error: { code: "FORBIDDEN", message: msg } }, { status: 403 });
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    await requireProjectMember(user.id, id);

    const body = await request.json();
    const project = await prisma.project.update({
      where: { id },
      data: { name: body.name, description: body.description },
    });

    return NextResponse.json({ data: project });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update project";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    await requireProjectOwner(user.id, id);

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete project";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}
