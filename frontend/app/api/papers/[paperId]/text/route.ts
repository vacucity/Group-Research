import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/file-storage";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
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

    // Extract text using pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const path = await import("path");
    const { pathToFileURL } = await import("url");
    const workerPath = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

    const data = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data }).promise;

    // Extract text from first 10 pages (enough for Q&A context)
    const pageLimit = Math.min(10, doc.numPages);
    const pages: string[] = [];

    for (let i = 1; i <= pageLimit; i++) {
      try {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: unknown) => {
            if (typeof item === "object" && item !== null && "str" in item) {
              return (item as { str: string }).str;
            }
            return "";
          })
          .join(" ");
        pages.push(`[Page ${i}]\n${pageText}`);
      } catch {
        pages.push(`[Page ${i}] (could not extract)`);
      }
    }

    return NextResponse.json({
      data: {
        text: pages.join("\n\n"),
        pageCount: doc.numPages,
        pagesExtracted: pageLimit,
      },
    });
  } catch (e) {
    return NextResponse.json({
      error: { code: "SERVER_ERROR", message: String(e) },
      data: { text: "", pageCount: 0, pagesExtracted: 0 },
    });
  }
}
