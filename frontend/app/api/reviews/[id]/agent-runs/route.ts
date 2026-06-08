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

    const runs = await prisma.agentRun.findMany({
      where: { workspaceId },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: runs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch agent runs";
    if (msg.includes("Forbidden"))
      return NextResponse.json({ error: { code: "FORBIDDEN", message: msg } }, { status: 403 });
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
