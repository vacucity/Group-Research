import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";
import { saveFile } from "@/lib/file-storage";
import { extractPDFMetadata } from "@/lib/pdf-metadata";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const projectId = request.nextUrl.searchParams.get("projectId");
    const search = request.nextUrl.searchParams.get("search");

    if (!projectId) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "projectId is required" } },
        { status: 400 }
      );
    }

    await requireProjectMember(user.id, projectId);

    const where: Record<string, unknown> = { projectId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { authors: { contains: search } },
        { abstract: { contains: search } },
      ];
    }

    const papers = await prisma.paper.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: papers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch papers";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "File and projectId are required" } },
        { status: 400 }
      );
    }

    await requireProjectMember(user.id, projectId);

    // Create paper record first to get ID
    const paper = await prisma.paper.create({
      data: {
        projectId,
        title: file.name.replace(/\.pdf$/i, ""),
        fileName: file.name,
        filePath: "",
        fileSize: file.size,
        uploadedBy: user.id,
      },
    });

    // Upload to blob storage + extract metadata in parallel
    const buffer = Buffer.from(await file.arrayBuffer());
    const [fileUrl, metadata] = await Promise.all([
      saveFile(buffer, projectId, paper.id),
      extractPDFMetadata(buffer, file.name),
    ]);

    // Update paper with metadata
    const updated = await prisma.paper.update({
      where: { id: paper.id },
      data: {
        title: metadata.title || paper.title,
        authors: metadata.authors,
        abstract: metadata.abstract,
        filePath: fileUrl,
        pageCount: metadata.pageCount,
      },
      include: { tags: { include: { tag: true } } },
    });

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to upload paper";
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}
