import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { createProjectSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: user.id } } },
      include: {
        _count: { select: { papers: true, members: true } },
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: projects });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch projects";
    if (msg.includes("Unauthorized")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: msg } }, { status: 401 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || "",
        createdBy: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create project";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}
