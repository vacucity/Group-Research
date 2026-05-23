import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";
import { inviteMemberSchema } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    await requireProjectMember(user.id, id);

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    return NextResponse.json({ data: members });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch members";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;
    await requireProjectMember(user.id, id);

    const body = await request.json();
    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const invitedUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!invitedUser) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found with that email" } },
        { status: 404 }
      );
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: invitedUser.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "User is already a member" } },
        { status: 409 }
      );
    }

    const member = await prisma.projectMember.create({
      data: { projectId: id, userId: invitedUser.id, role: parsed.data.role },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to invite member";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}
