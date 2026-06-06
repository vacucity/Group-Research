import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId } = await params;
    await requireReviewMember(user.id, workspaceId);
    const body = await request.json();
    const { type, value } = body; // type: "doi" | "bibtex" | "arxiv" | "semantic", value: string

    if (!type || !value) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "type and value are required" } },
        { status: 400 }
      );
    }

    let paperData = { title: value, authors: "", abstract: "", year: null as number | null, sourceId: value };

    if (type === "doi") {
      // Try to fetch from Semantic Scholar or CrossRef
      try {
        const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(value)}?fields=title,authors,year,abstract`);
        if (res.ok) {
          const json = await res.json();
          paperData.title = json.title || value;
          paperData.authors = (json.authors || []).map((a: { name: string }) => a.name).join(", ");
          paperData.year = json.year || null;
          paperData.abstract = json.abstract || "";
          paperData.sourceId = value;
        }
      } catch {
        // Fallback: use minimal data
      }
    } else if (type === "arxiv") {
      try {
        const arxivId = value.replace("https://arxiv.org/abs/", "").replace("arxiv:", "");
        const res = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`);
        if (res.ok) {
          const xml = await res.text();
          const titleMatch = xml.match(/<title>(.*?)<\/title>/);
          const authorsMatch = xml.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g);
          const abstractMatch = xml.match(/<summary>(.*?)<\/summary>/);
          if (titleMatch) paperData.title = titleMatch[1].trim();
          if (authorsMatch) paperData.authors = authorsMatch.map(a => {
            const m = a.match(/<name>(.*?)<\/name>/);
            return m ? m[1] : "";
          }).join(", ");
          if (abstractMatch) paperData.abstract = abstractMatch[1].trim();
          paperData.sourceId = arxivId;
        }
      } catch {
        // Fallback
      }
    } else if (type === "bibtex") {
      // Simple BibTeX parsing
      const titleMatch = value.match(/title\s*=\s*[{"]\s*(.*?)\s*["}]/);
      const authorMatch = value.match(/author\s*=\s*[{"]\s*(.*?)\s*["}]/);
      const yearMatch = value.match(/year\s*=\s*[{"]\s*(\d{4})\s*["}]/);
      const abstractMatch = value.match(/abstract\s*=\s*[{"]\s*(.*?)\s*["}]/);
      if (titleMatch) paperData.title = titleMatch[1];
      if (authorMatch) paperData.authors = authorMatch[1];
      if (yearMatch) paperData.year = parseInt(yearMatch[1]);
      if (abstractMatch) paperData.abstract = abstractMatch[1];
      paperData.sourceId = "";
    }

    const paper = await prisma.reviewPaper.create({
      data: {
        workspaceId,
        title: paperData.title,
        authors: paperData.authors || null,
        abstract: paperData.abstract || null,
        year: paperData.year,
        source: type,
        sourceId: paperData.sourceId || null,
      },
    });

    return NextResponse.json({ data: paper }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to import paper";
    if (msg.includes("unique")) {
      return NextResponse.json(
        { error: { code: "DUPLICATE", message: "Paper already exists in this workspace" } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
