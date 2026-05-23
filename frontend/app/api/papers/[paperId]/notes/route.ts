import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";
import { createNoteSchema } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { paperId } = await params;

    const paper = await prisma.paper.findUnique({ where: { id: paperId } });
    if (!paper) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found" } }, { status: 404 });
    await requireProjectMember(user.id, paper.projectId);

    const notes = await prisma.note.findMany({
      where: { paperId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: notes });
  } catch (e) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: String(e) } }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { paperId } = await params;

    const paper = await prisma.paper.findUnique({ where: { id: paperId } });
    if (!paper) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found" } }, { status: 404 });
    await requireProjectMember(user.id, paper.projectId);

    const body = await request.json();
    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        paperId,
        userId: user.id,
        type: parsed.data.type,
        content: parsed.data.content,
        targetText: parsed.data.targetText,
        pageNumber: parsed.data.pageNumber,
        boundingBox: parsed.data.boundingBox,
        metadata: parsed.data.metadata,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: String(e) } }, { status: 500 });
  }
}
