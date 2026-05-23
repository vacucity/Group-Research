import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";
import { createTagSchema } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { paperId } = await params;

    const paper = await prisma.paper.findUnique({ where: { id: paperId } });
    if (!paper) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found" } }, { status: 404 });
    await requireProjectMember(user.id, paper.projectId);

    const tags = await prisma.paperTag.findMany({
      where: { paperId },
      include: { tag: true },
    });

    return NextResponse.json({ data: tags });
  } catch (e) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: String(e) } }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { paperId } = await params;
    const body = await request.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 400 });
    }

    const paper = await prisma.paper.findUnique({ where: { id: paperId } });
    if (!paper) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found" } }, { status: 404 });
    await requireProjectMember(user.id, paper.projectId);

    // Create or find tag
    const tag = await prisma.tag.upsert({
      where: { name: parsed.data.name },
      update: {},
      create: { name: parsed.data.name, color: parsed.data.color || "#6366f1" },
    });

    try {
      const paperTag = await prisma.paperTag.create({
        data: { paperId, tagId: tag.id },
        include: { tag: true },
      });
      return NextResponse.json({ data: paperTag }, { status: 201 });
    } catch {
      return NextResponse.json({ error: { code: "CONFLICT", message: "Tag already added" } }, { status: 409 });
    }
  } catch (e) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: String(e) } }, { status: 500 });
  }
}
