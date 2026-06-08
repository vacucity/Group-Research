import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId, vid: versionId } = await params;
    await requireReviewMember(user.id, workspaceId);

    const version = await prisma.reviewVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Version not found" } },
        { status: 404 }
      );
    }

    if (!version.snapshotData) {
      return NextResponse.json(
        { error: { code: "INVALID", message: "No snapshot data to restore" } },
        { status: 400 }
      );
    }

    const snapshot = JSON.parse(version.snapshotData);

    // Restore clusters
    if (snapshot.clusters) {
      await prisma.topicCluster.deleteMany({ where: { workspaceId } });
      for (const c of snapshot.clusters) {
        await prisma.topicCluster.create({
          data: {
            workspaceId,
            name: c.name,
            description: c.description || null,
            color: c.color || "#6366f1",
            paperIds: c.paperIds || "[]",
          },
        });
      }
    }

    // Restore outline items
    if (snapshot.outline) {
      await prisma.reviewOutlineItem.deleteMany({ where: { workspaceId } });
      for (const o of snapshot.outline) {
        await prisma.reviewOutlineItem.create({
          data: {
            workspaceId,
            title: o.title,
            orderIndex: o.orderIndex || 0,
            sectionType: o.sectionType || "body",
          },
        });
      }
    }

    // Restore sections
    if (snapshot.sections) {
      await prisma.reviewSection.deleteMany({ where: { workspaceId } });
      for (const s of snapshot.sections) {
        await prisma.reviewSection.create({
          data: {
            workspaceId,
            title: s.title,
            content: typeof s.content === "string" ? s.content : JSON.stringify(s.content || {}),
            orderIndex: s.orderIndex || 0,
            status: s.status || "not_started",
          },
        });
      }
    }

    return NextResponse.json({
      data: {
        success: true,
        restoredFrom: version.label || `Version ${version.versionNumber}`,
        items: {
          clusters: snapshot.clusters?.length || 0,
          outline: snapshot.outline?.length || 0,
          sections: snapshot.sections?.length || 0,
        },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to restore version";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
