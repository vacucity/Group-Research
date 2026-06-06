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

    const papers = await prisma.reviewPaper.findMany({
      where: { workspaceId },
      orderBy: { addedAt: "desc" },
    });

    return NextResponse.json({ data: papers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch papers";
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

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Title is required" } },
        { status: 400 }
      );
    }

    const paper = await prisma.reviewPaper.create({
      data: {
        workspaceId,
        title: body.title.trim(),
        authors: body.authors?.trim() || null,
        abstract: body.abstract?.trim() || null,
        year: body.year ? parseInt(String(body.year)) : null,
        source: body.source || "manual",
        sourceId: body.sourceId?.trim() || null,
        fileName: body.fileName?.trim() || null,
        filePath: body.filePath?.trim() || null,
        fileSize: body.fileSize ? parseInt(String(body.fileSize)) : null,
      },
    });

    return NextResponse.json({ data: paper }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to add paper";
    if (msg.includes("unique")) {
      return NextResponse.json(
        { error: { code: "DUPLICATE", message: "Paper already exists in this workspace" } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
