import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const workspaces = await prisma.reviewWorkspace.findMany({
      where: {
        OR: [
          { createdBy: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        _count: { select: { papers: true, clusters: true, gaps: true, sections: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ data: workspaces });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch reviews";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Name is required" } },
        { status: 400 }
      );
    }

    const workspace = await prisma.reviewWorkspace.create({
      data: {
        name: body.name.trim(),
        researchField: body.researchField?.trim() || null,
        reviewType: body.reviewType || "survey",
        targetVenue: body.targetVenue?.trim() || null,
        description: body.description?.trim() || null,
        createdBy: user.id,
      },
    });

    // Auto-add creator as OWNER member
    await prisma.reviewMember.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
    });

    return NextResponse.json({ data: workspace }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create review workspace";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
