import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gapId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId, gapId } = await params;
    await requireReviewMember(user.id, workspaceId);

    const gap = await prisma.researchGap.findUnique({ where: { id: gapId } });
    if (!gap || gap.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Gap not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updated = await prisma.researchGap.update({
      where: { id: gapId },
      data: {
        status: "resolved",
        description: `${gap.description}\n\n[Rejected: ${body.reason || "No reason provided"}]`,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to reject gap";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
