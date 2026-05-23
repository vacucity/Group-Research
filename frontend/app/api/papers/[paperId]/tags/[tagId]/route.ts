import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string; tagId: string }> }
) {
  try {
    const { paperId, tagId } = await params;

    await prisma.paperTag.delete({
      where: { paperId_tagId: { paperId, tagId } },
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to remove tag" } }, { status: 500 });
  }
}
