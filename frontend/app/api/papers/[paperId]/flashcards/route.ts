import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// GET: List flashcard notes for a paper
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { paperId } = await params;

    const notes = await prisma.note.findMany({
      where: { paperId, type: "FLASHCARD" },
      include: {
        flashcards: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: notes });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to fetch flashcards" } },
      { status: 500 }
    );
  }
}

// POST: Save generated flashcards as a note with child flashcards
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { paperId } = await params;

    const body = await request.json();
    const { content } = body;
    if (!content) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Content is required" } },
        { status: 400 }
      );
    }

    // Parse Q&A pairs from the AI output (**Q:** ... **A:** ...)
    const pairs: { front: string; back: string }[] = [];
    const lines = content.split("\n");
    let currentQ = "";
    let currentA = "";

    for (const line of lines) {
      const qMatch = line.match(/^\*\*Q:\*\*\s*(.+)/);
      const aMatch = line.match(/^\*\*A:\*\*\s*(.+)/);
      if (qMatch) {
        if (currentQ && currentA) {
          pairs.push({ front: currentQ, back: currentA });
        }
        currentQ = qMatch[1].trim();
        currentA = "";
      } else if (aMatch) {
        currentA = aMatch[1].trim();
      }
    }
    if (currentQ && currentA) {
      pairs.push({ front: currentQ, back: currentA });
    }

    if (pairs.length === 0) {
      return NextResponse.json(
        { error: { code: "PARSE_ERROR", message: "No Q&A pairs found in content" } },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        paperId,
        userId: user.id,
        type: "FLASHCARD",
        content: content.substring(0, 5000),
        flashcards: {
          create: pairs.map((p) => ({
            front: p.front,
            back: p.back,
          })),
        },
      },
      include: { flashcards: true },
    });

    return NextResponse.json({ data: note });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save flashcards";
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

// DELETE: Remove a flashcard note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");
    if (!noteId) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "noteId required" } },
        { status: 400 }
      );
    }

    await prisma.note.delete({ where: { id: noteId } });
    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to delete" } },
      { status: 500 }
    );
  }
}
