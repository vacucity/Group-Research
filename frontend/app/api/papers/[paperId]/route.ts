import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";
import { getFile } from "@/lib/file-storage";

export async function GET(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { paperId } = await params;

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: { tags: { include: { tag: true } } },
    });

    if (!paper) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found" } }, { status: 404 });
    }

    await requireProjectMember(user.id, paper.projectId);

    return NextResponse.json({ data: paper });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch paper";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { paperId } = await params;

    const paper = await prisma.paper.findUnique({ where: { id: paperId } });
    if (!paper) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found" } }, { status: 404 });
    }

    await requireProjectMember(user.id, paper.projectId);

    // Delete file from disk
    const { deleteFile } = await import("@/lib/file-storage");
    await deleteFile(paper.filePath);

    await prisma.paper.delete({ where: { id: paperId } });

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete paper";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}
