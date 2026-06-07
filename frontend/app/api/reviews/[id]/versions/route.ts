import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId } = await params;
    await requireReviewMember(user.id, workspaceId);

    const versions = await prisma.reviewVersion.findMany({
      where: { workspaceId },
      orderBy: { versionNumber: "desc" },
    });

    return NextResponse.json({ data: versions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch versions";
    if (msg.includes("Forbidden"))
      return NextResponse.json({ error: { code: "FORBIDDEN", message: msg } }, { status: 403 });
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
    const { id: workspaceId } = await params;
    await requireReviewMember(user.id, workspaceId);
    const body = await request.json();

    // Get current version count
    const lastVersion = await prisma.reviewVersion.findFirst({
      where: { workspaceId },
      orderBy: { versionNumber: "desc" },
    });
    const nextNumber = (lastVersion?.versionNumber ?? 0) + 1;

    // Build snapshot from workspace data
    const workspace = await prisma.reviewWorkspace.findUnique({
      where: { id: workspaceId },
      include: {
        clusters: true,
        gaps: true,
        sections: true,
        tables: true,
        outline: true,
      },
    });

    const snapshot = {
      name: workspace?.name,
      researchField: workspace?.researchField,
      reviewType: workspace?.reviewType,
      clusters: workspace?.clusters || [],
      gaps: workspace?.gaps || [],
      sections: workspace?.sections || [],
      outline: workspace?.outline || [],
      tables: workspace?.tables || [],
    };

    const version = await prisma.reviewVersion.create({
      data: {
        workspaceId,
        versionNumber: nextNumber,
        label: body.label?.trim() || `Version ${nextNumber}`,
        snapshotData: JSON.stringify(snapshot),
        createdBy: user.id,
      },
    });

    return NextResponse.json({ data: version }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create version";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
