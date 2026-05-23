import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export async function getCurrentUser(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  return { id: user.id, email: user.email, name: user.name };
}

export async function requireProjectMember(userId: string, projectId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new Error("Forbidden: not a project member");
  return member;
}
