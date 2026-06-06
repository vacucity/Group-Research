import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    await requireReviewMember(user.id, id);

    const workspace = await prisma.reviewWorkspace.findUnique({
      where: { id },
      include: {
        _count: { select: { papers: true, clusters: true, gaps: true, sections: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
        papers: { orderBy: { addedAt: "desc" } },
        clusters: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Workspace not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: workspace });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch workspace";
    if (msg.includes("Forbidden"))
      return NextResponse.json({ error: { code: "FORBIDDEN", message: msg } }, { status: 403 });
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    await requireReviewMember(user.id, id);
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.researchField !== undefined) data.researchField = body.researchField;
    if (body.reviewType !== undefined) data.reviewType = body.reviewType;
    if (body.targetVenue !== undefined) data.targetVenue = body.targetVenue;
    if (body.description !== undefined) data.description = body.description;

    const updated = await prisma.reviewWorkspace.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update workspace";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    // Only owner can delete
    const member = await prisma.reviewMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
    });
    if (!member || member.role !== "OWNER") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only owner can delete" } },
        { status: 403 }
      );
    }

    await prisma.reviewWorkspace.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete workspace";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
