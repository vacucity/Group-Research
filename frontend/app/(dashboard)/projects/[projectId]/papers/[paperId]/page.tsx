"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Paper, Note } from "@/types";
import { PDFViewer } from "@/components/papers/reader/PDFViewer";
import { Workspace } from "@/components/papers/reader/Workspace";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Languages,
  Brain,
  MessageCircle,
  Highlighter,
  X,
  Map,
  Columns,
  GripVertical,
  PanelRightOpen,
} from "lucide-react";
import { toast } from "sonner";

type WorkspaceTab = "notes" | "translate" | "analyze" | "qa" | "outline";

export default function PaperReaderPage() {
  const { projectId, paperId } = useParams<{
    projectId: string;
    paperId: string;
  }>();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("notes");
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [fullText, setFullText] = useState("");

  const [workspaceWidth, setWorkspaceWidth] = useState(420);
  const resizing = useRef(false);

  const fetchNotes = useCallback(() => {
    fetch(`/api/papers/${paperId}/notes`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setNotes(json.data);
      })
      .catch(() => {});
  }, [paperId]);

  useEffect(() => {
    fetch(`/api/papers/${paperId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setPaper(json.data);
      })
      .finally(() => setLoading(false));
    fetchNotes();
    fetch(`/api/papers/${paperId}/text`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.text) setFullText(json.data.text);
      })
      .catch(() => {});
  }, [paperId, fetchNotes]);

  const handleTextSelect = useCallback((text: string) => {
    if (text.length > 3) setSelectedText(text);
  }, []);

  const handleSaveNote = async (
    content: string,
    original: string,
    type: string
  ) => {
    try {
      const res = await fetch(`/api/papers/${paperId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          content: content || original.substring(0, 500),
          targetText: original,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      toast.success("Saved to workspace");
      fetchNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await fetch(`/api/papers/${paperId}/notes/${noteId}`, { method: "DELETE" });
    fetchNotes();
  };

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const w = window.innerWidth - ev.clientX;
      setWorkspaceWidth(Math.max(300, Math.min(800, w)));
    };

    const onUp = () => {
      resizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }
  if (!paper) return null;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col -m-6">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl shrink-0">
        <h1 className="text-sm font-medium text-[var(--foreground)] truncate max-w-lg">
          {paper.title}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="text-[var(--muted-foreground)] gap-1.5"
        >
          <Columns className="h-4 w-4" />
          {workspaceOpen ? "Hide" : "Show"} Workspace
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* PDF area */}
        <div className="flex-1 overflow-auto bg-[var(--muted)]/30">
          <PDFViewer
            pdfUrl={`/api/papers/${paperId}/serve`}
            onTextSelect={handleTextSelect}
          />
        </div>

        {/* Draggable divider + Workspace */}
        {workspaceOpen && (
          <>
            {/* Drag handle with visible grip ball */}
            <div
              className="w-4 cursor-col-resize shrink-0 relative flex items-center justify-center group"
              onMouseDown={startResize}
            >
              {/* Expanded hit area */}
              <div className="absolute inset-y-0 -left-1 -right-1" />
              {/* Grip ball */}
              <div className="h-10 w-5 rounded-full bg-[var(--border)] group-hover:bg-[var(--primary)]/40 group-active:bg-[var(--primary)]/60 flex items-center justify-center transition-colors">
                <GripVertical className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
              </div>
            </div>

            {/* Workspace */}
            <div
              style={{ width: workspaceWidth }}
              className="shrink-0 overflow-hidden"
            >
              <Workspace
                notes={notes}
                selectedText={selectedText}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                paperContext={fullText}
                paperTitleAbstract={`${paper.title}\n${paper.abstract || ""}`}
                paperId={paperId}
                onSaveNote={handleSaveNote}
                onDeleteNote={handleDeleteNote}
                onRefreshNotes={fetchNotes}
                onClearSelection={() => setSelectedText(null)}
              />
            </div>
          </>
        )}

        {/* Floating restore button — visible when workspace is hidden */}
        {!workspaceOpen && (
          <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={() => setWorkspaceOpen(true)}
              className="h-12 w-12 rounded-full bg-[var(--card)] border border-[var(--border)] shadow-lg flex items-center justify-center hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] hover:border-[var(--primary)] transition-all group"
              title="Open Workspace"
            >
              <PanelRightOpen className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Floating navigation toolbar — always visible */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-0.5 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-2xl p-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("translate")}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] gap-1.5"
            >
              <Languages className="h-4 w-4" /> Translate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("analyze")}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] gap-1.5"
            >
              <Brain className="h-4 w-4" /> Analyze
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("qa")}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] gap-1.5"
            >
              <MessageCircle className="h-4 w-4" /> Ask
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("outline")}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] gap-1.5"
            >
              <Map className="h-4 w-4" /> Outline
            </Button>
            <div className="w-px h-5 bg-[var(--border)] mx-1" />
            <Button
              variant="ghost"
              size="sm"
              disabled={!selectedText}
              onClick={() => {
                if (!selectedText) return;
                handleSaveNote(
                  selectedText.substring(0, 100),
                  selectedText,
                  "HIGHLIGHT"
                );
                setSelectedText(null);
              }}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] gap-1.5 disabled:opacity-30"
            >
              <Highlighter className="h-4 w-4 text-yellow-500" /> Highlight
            </Button>
            {selectedText && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[var(--muted-foreground)]"
                onClick={() => setSelectedText(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
