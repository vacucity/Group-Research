import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { saveFile } from "@/lib/file-storage";

async function tryDownloadPdf(sourceId: string): Promise<Buffer | null> {
  // arXiv ID: "arXiv:1904.07272" or bare "1904.07272"
  const arxivMatch = sourceId.match(/arXiv[:/]?(\d+\.\d+)/i) || sourceId.match(/^(\d{4}\.\d+)$/);
  if (arxivMatch) {
    try {
      const url = `https://arxiv.org/pdf/${arxivMatch[1]}.pdf`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok && res.headers.get("content-type")?.includes("pdf")) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch {
      // Fall through to metadata-only
    }
  }

  // Semantic Scholar paper ID: try their API for open access PDF
  if (/^[a-f0-9]{40}$/i.test(sourceId)) {
    try {
      const ssRes = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/${sourceId}?fields=externalIds,openAccessPdf`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (ssRes.ok) {
        const data = await ssRes.json();
        const pdfUrl = data.openAccessPdf?.url;
        if (pdfUrl) {
          const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(15000) });
          if (pdfRes.ok) {
            return Buffer.from(await pdfRes.arrayBuffer());
          }
        }
        // Also try arXiv ID from external IDs
        const arxivId = data.externalIds?.ArXiv;
        if (arxivId) {
          try {
            const arxivUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
            const arxivRes = await fetch(arxivUrl, { signal: AbortSignal.timeout(15000) });
            if (arxivRes.ok && arxivRes.headers.get("content-type")?.includes("pdf")) {
              return Buffer.from(await arxivRes.arrayBuffer());
            }
          } catch {
            // OK, no PDF
          }
        }
      }
    } catch {
      // API error, continue without PDF
    }
  }

  return null;
}

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

    // Create the paper record
    const paper = await prisma.paper.create({
      data: {
        projectId,
        title,
        authors: authors || null,
        abstract: abstract || null,
        fileName: `${title}.pdf`,
        filePath: "",
        fileSize: 0,
        uploadedBy: user.id,
      },
    });

    // Try to download the PDF
    if (sourceId) {
      const pdfBuffer = await tryDownloadPdf(sourceId);
      if (pdfBuffer) {
        const fileUrl = await saveFile(pdfBuffer, projectId, paper.id);
        await prisma.paper.update({
          where: { id: paper.id },
          data: { filePath: fileUrl, fileSize: pdfBuffer.length },
        });
        return NextResponse.json({
          data: { ...paper, filePath: fileUrl, fileSize: pdfBuffer.length },
          pdfDownloaded: true,
        });
      }
    }

    return NextResponse.json({ data: paper, pdfDownloaded: false });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to import paper" } },
      { status: 500 }
    );
  }
}
