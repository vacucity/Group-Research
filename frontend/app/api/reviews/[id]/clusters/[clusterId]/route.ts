import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clusterId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId, clusterId } = await params;
    await requireReviewMember(user.id, workspaceId);
    const body = await request.json();

    const cluster = await prisma.topicCluster.findUnique({ where: { id: clusterId } });
    if (!cluster || cluster.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Cluster not found" } },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.color !== undefined) data.color = body.color;
    if (body.paperIds !== undefined) data.paperIds = JSON.stringify(body.paperIds);

    const updated = await prisma.topicCluster.update({
      where: { id: clusterId },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update cluster";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clusterId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId, clusterId } = await params;
    await requireReviewMember(user.id, workspaceId);

    const cluster = await prisma.topicCluster.findUnique({ where: { id: clusterId } });
    if (!cluster || cluster.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Cluster not found" } },
        { status: 404 }
      );
    }

    await prisma.topicCluster.delete({ where: { id: clusterId } });
    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete cluster";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
