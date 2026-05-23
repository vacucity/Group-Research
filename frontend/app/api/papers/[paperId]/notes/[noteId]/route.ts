import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateNoteSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string; noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const body = await request.json();
    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 400 });
    }

    const note = await prisma.note.update({
      where: { id: noteId },
      data: { content: parsed.data.content },
    });

    return NextResponse.json({ data: note });
  } catch {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update note" } }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string; noteId: string }> }
) {
  try {
    await prisma.note.delete({ where: { id: (await params).noteId } });
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete note" } }, { status: 500 });
  }
}
