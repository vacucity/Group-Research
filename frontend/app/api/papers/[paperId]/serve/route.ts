import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/file-storage";

// PDF serve is public — protected by unguessable CUID paper ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;

    const paper = await prisma.paper.findUnique({ where: { id: paperId } });
    if (!paper) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found" } }, { status: 404 });
    }

    const buffer = await getFile(paper.filePath);
    if (!buffer) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "PDF file not found" } }, { status: 404 });
    }

    const safeFileName = encodeURIComponent(paper.fileName);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${safeFileName}`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to serve PDF";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}
