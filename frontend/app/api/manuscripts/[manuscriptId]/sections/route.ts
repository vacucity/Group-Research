import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";

export async function POST(
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

    // Get the next orderIndex
    const lastSection = await prisma.manuscriptSection.findFirst({
      where: { manuscriptId },
      orderBy: { orderIndex: "desc" },
    });
    const nextIndex = (lastSection?.orderIndex ?? -1) + 1;

    const section = await prisma.manuscriptSection.create({
      data: {
        manuscriptId,
        title: body.title || `Section ${nextIndex + 1}`,
        sectionType: body.sectionType || "body",
        orderIndex: body.orderIndex ?? nextIndex,
      },
    });

    return NextResponse.json({ data: section }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create section";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
