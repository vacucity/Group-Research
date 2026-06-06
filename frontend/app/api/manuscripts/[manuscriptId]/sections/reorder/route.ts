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
    const { orders } = body as {
      orders: { id: string; orderIndex: number }[];
    };

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

    // Batch update all section orderIndex values in a transaction
    await prisma.$transaction(
      orders.map(({ id, orderIndex }) =>
        prisma.manuscriptSection.update({
          where: { id },
          data: { orderIndex },
        })
      )
    );

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to reorder sections";
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
