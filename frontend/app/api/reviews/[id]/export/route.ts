import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireReviewMember } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: workspaceId } = await params;
    await requireReviewMember(user.id, workspaceId);
    const format = new URL(request.url).searchParams.get("format") || "md";

    const workspace = await prisma.reviewWorkspace.findUnique({
      where: { id: workspaceId },
      include: {
        sections: { orderBy: { orderIndex: "asc" } },
        clusters: { orderBy: { createdAt: "desc" } },
        gaps: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Workspace not found" } },
        { status: 404 }
      );
    }

    let content = "";
    let contentType = "text/plain";
    let filename = "";

    switch (format) {
      case "md":
      case "markdown":
        content = generateMarkdown(workspace);
        contentType = "text/markdown";
        filename = `${workspace.name.replace(/\s+/g, "_")}.md`;
        break;

      case "csv":
        content = generateCSV(workspace.sections);
        contentType = "text/csv";
        filename = `${workspace.name.replace(/\s+/g, "_")}_sections.csv`;
        break;

      case "latex":
        content = generateLatex(workspace);
        contentType = "application/x-tex";
        filename = `${workspace.name.replace(/\s+/g, "_")}.tex`;
        break;

      default:
        content = generateMarkdown(workspace);
        contentType = "text/markdown";
        filename = `${workspace.name.replace(/\s+/g, "_")}.md`;
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to export";
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

function generateMarkdown(workspace: Record<string, unknown>): string {
  const sections = (workspace.sections as Array<Record<string, unknown>>) || [];
  const clusters = (workspace.clusters as Array<Record<string, unknown>>) || [];
  const gaps = (workspace.gaps as Array<Record<string, unknown>>) || [];

  let md = `# ${workspace.name || "Literature Review"}\n\n`;

  if (workspace.description) md += `> ${workspace.description}\n\n`;

  md += `---\n\n`;

  // Topic clusters
  if (clusters.length > 0) {
    md += `## Topic Clusters\n\n`;
    for (const c of clusters) {
      md += `- **${c.name}**: ${c.description || ""}\n`;
    }
    md += "\n---\n\n";
  }

  // Sections
  for (const s of sections) {
    md += `## ${s.title}\n\n`;
    try {
      const jsonStr = typeof s.content === "string" ? s.content : JSON.stringify(s.content);
      const doc = JSON.parse(jsonStr);
      if (doc.content && Array.isArray(doc.content)) {
        for (const node of doc.content) {
          md += extractTipTapText(node) + "\n\n";
        }
      } else if (typeof doc.content === "string") {
        md += doc.content + "\n\n";
      } else {
        md += jsonStr + "\n\n";
      }
    } catch {
      md += String(s.content || "") + "\n\n";
    }
  }

  // Gaps
  if (gaps.length > 0) {
    md += `---\n\n## Identified Research Gaps\n\n`;
    for (const g of gaps) {
      md += `### ${g.title}\n\n${g.description}\n\n`;
    }
  }

  return md;
}

function extractTipTapText(node: Record<string, unknown>): string {
  if (node.type === "heading") {
    const level = ((node.attrs as Record<string, number>)?.level || 1) + 1;
    return "#".repeat(Math.min(level, 6)) + " " + extractInline(node);
  }
  if (node.type === "paragraph") return extractInline(node);
  if (node.type === "bulletList" || node.type === "orderedList") {
    return ((node.content as Array<Record<string, unknown>>) || [])
      .map((item, i) => (node.type === "orderedList" ? `${i + 1}. ` : "- ") + extractInline(item))
      .join("\n");
  }
  if (node.type === "codeBlock") return "```\n" + extractInline(node) + "\n```";
  return extractInline(node);
}

function extractInline(node: Record<string, unknown>): string {
  if (!node.content || !Array.isArray(node.content)) return "";
  return (node.content as Array<Record<string, unknown>>)
    .map((c) => (c.type === "text" ? String(c.text || "") : extractInline(c)))
    .join("");
}

function generateCSV(sections: Array<Record<string, unknown>>): string {
  let csv = "Section,Status,Character Count\n";
  for (const s of sections) {
    const text = typeof s.content === "string" ? s.content : JSON.stringify(s.content || "");
    csv += `"${s.title}",${s.status},${text.length}\n`;
  }
  return csv;
}

function generateLatex(workspace: Record<string, unknown>): string {
  const sections = (workspace.sections as Array<Record<string, unknown>>) || [];

  let latex = `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\title{${escapeLatex(String(workspace.name || "Literature Review"))}}\n\\begin{document}\n\\maketitle\n\n`;

  for (const s of sections) {
    latex += `\\section{${escapeLatex(String(s.title))}}\n\n`;
    try {
      const content = typeof s.content === "string" ? s.content : JSON.stringify(s.content || "");
      // Extract plain text from TipTap JSON
      latex += extractPlainText(JSON.parse(content)) + "\n\n";
    } catch {
      latex += String(s.content || "") + "\n\n";
    }
  }

  latex += "\\end{document}\n";
  return latex;
}

function escapeLatex(text: string): string {
  return text.replace(/[&%$#_{}~^\\]/g, "\\$&").replace(/"/g, "''");
}

function extractPlainText(doc: Record<string, unknown>): string {
  if (!doc.content || !Array.isArray(doc.content)) return "";
  return (doc.content as Array<Record<string, unknown>>)
    .map((node) => extractInline(node))
    .filter(Boolean)
    .join("\n\n");
}
