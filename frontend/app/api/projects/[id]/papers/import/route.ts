import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const projectId = (await params).id;
    const body = await request.json();
    const { title, authors, abstract, year, source, sourceId } = body;

    if (!title) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Title required" } },
        { status: 400 }
      );
    }

    // Create a metadata-only paper entry (user can upload PDF later)
    const paper = await prisma.paper.create({
      data: {
        projectId,
        title,
        authors: authors || null,
        abstract: abstract || null,
        fileName: "_imported_",
        filePath: sourceId || source || "",
        fileSize: 0,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({ data: paper });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to import paper" } },
      { status: 500 }
    );
  }
}
