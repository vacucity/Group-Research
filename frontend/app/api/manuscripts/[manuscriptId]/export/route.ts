import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireProjectMember } from "@/lib/auth-helpers";

// Helper: extract plain text from TipTap JSON
function extractTextFromDoc(doc: Record<string, unknown>): string {
  const lines: string[] = [];
  if (!doc || !doc.content || !Array.isArray(doc.content)) return "";

  for (const node of doc.content as Array<Record<string, unknown>>) {
    if (node.type === "heading") {
      const level = (node.attrs as Record<string, number>)?.level || 1;
      const text = extractInlineText(node);
      lines.push(`${"#".repeat(level)} ${text}`, "");
    } else if (node.type === "paragraph") {
      lines.push(extractInlineText(node), "");
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      for (const item of (node.content as Array<Record<string, unknown>>) || []) {
        const prefix = node.type === "orderedList" ? "1. " : "- ";
        lines.push(`${prefix}${extractInlineText(item)}`);
      }
      lines.push("");
    } else if (node.type === "blockquote") {
      const text = extractInlineText(node);
      lines.push(...text.split("\n").map((l) => `> ${l}`), "");
    } else if (node.type === "codeBlock") {
      const code = extractInlineText(node);
      lines.push("```", code, "```", "");
    }
  }
  return lines.join("\n");
}

function extractInlineText(node: Record<string, unknown>): string {
  if (!node.content || !Array.isArray(node.content)) return "";
  let text = "";
  for (const child of node.content as Array<Record<string, unknown>>) {
    if (child.type === "text") {
      text += child.text || "";
    } else {
      text += extractInlineText(child);
    }
  }
  return text.trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ manuscriptId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { manuscriptId } = await params;

    const manuscript = await prisma.manuscript.findUnique({
      where: { id: manuscriptId },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!manuscript) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Manuscript not found" } },
        { status: 404 }
      );
    }
    await requireProjectMember(user.id, manuscript.projectId);

    const parts: string[] = [];
    parts.push(`# ${manuscript.title}`);
    if (manuscript.abstract) {
      parts.push("", `> **Abstract:** ${manuscript.abstract}`, "");
    }
    parts.push("");

    for (const section of manuscript.sections) {
      parts.push(`## ${section.title}`, "");

      if (section.contentMode === "latex" && section.latexContent) {
        // LaTeX mode — include raw LaTeX
        parts.push(section.latexContent, "");
      } else {
        // WYSIWYG mode — extract text from TipTap JSON
        try {
          const doc =
            typeof section.content === "string"
              ? JSON.parse(section.content)
              : section.content;
          const text = extractTextFromDoc(doc as Record<string, unknown>);
          parts.push(text || "(empty section)", "");
        } catch {
          parts.push(String(section.content || "(empty)"), "");
        }
      }
    }

    const content = parts.join("\n");
    return NextResponse.json({ data: { content } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to export manuscript";
    if (msg.includes("Forbidden"))
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: msg } },
        { status: 403 }
      );
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
