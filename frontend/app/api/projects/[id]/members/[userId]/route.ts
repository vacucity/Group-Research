import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id, userId } = await params;
    await requireProjectMember(user.id, id);

    const body = await request.json();
    const member = await prisma.projectMember.update({
      where: { projectId_userId: { projectId: id, userId } },
      data: { role: body.role },
    });

    return NextResponse.json({ data: member });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update member" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id, userId } = await params;
    await requireProjectMember(user.id, id);

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: id, userId } },
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to remove member" } },
      { status: 500 }
    );
  }
}
