"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Manuscript, ManuscriptSection } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  FileText,
  ChevronLeft,
  Sparkles,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { ManuscriptEditor } from "@/components/writing/ManuscriptEditor";
import { SectionList } from "@/components/writing/SectionList";
import { marked } from "marked";

export default function ManuscriptEditorPage() {
  const { projectId, manuscriptId } = useParams<{
    projectId: string;
    manuscriptId: string;
  }>();

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [sections, setSections] = useState<ManuscriptSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // AI outline generation
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlineIdea, setOutlineIdea] = useState("");
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [outlineResult, setOutlineResult] = useState<string | null>(null);
  const [outlineResultOpen, setOutlineResultOpen] = useState(false);

  // Section creation
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // Export
  const [exportOpen, setExportOpen] = useState(false);
  const [exportContent, setExportContent] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchManuscript = useCallback(() => {
    fetch(`/api/manuscripts/${manuscriptId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setManuscript(json.data);
          setSections(json.data.sections || []);
          if (json.data.sections?.length > 0 && !activeSectionId) {
            setActiveSectionId(json.data.sections[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [manuscriptId]);

  useEffect(() => {
    fetchManuscript();
  }, [fetchManuscript]);

  const handleSaveContent = async (
    sectionId: string,
    content: Record<string, unknown>
  ) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/manuscripts/${manuscriptId}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      toast.error("Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      const res = await fetch(
        `/api/manuscripts/${manuscriptId}/sections`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newSectionTitle.trim(),
            sectionType: "body",
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      const newSection = json.data as ManuscriptSection;
      setSections([...sections, newSection]);
      setActiveSectionId(newSection.id);
      setNewSectionOpen(false);
      setNewSectionTitle("");
      toast.success("Section added");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add section"
      );
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await fetch(
        `/api/manuscripts/${manuscriptId}/sections/${sectionId}`,
        { method: "DELETE" }
      );
      const newSections = sections.filter((s) => s.id !== sectionId);
      setSections(newSections);
      if (activeSectionId === sectionId) {
        setActiveSectionId(newSections[0]?.id || null);
      }
      toast.success("Section deleted");
    } catch {
      toast.error("Failed to delete section");
    }
  };

  const handleGenerateOutline = async () => {
    if (!outlineIdea.trim()) return;
    setGeneratingOutline(true);
    try {
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "outline",
          idea: outlineIdea,
          literature: sections.map((s) => s.title).join(", "),
          language: "Chinese",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      const outlineText = json.data?.outline || "";
      setOutlineResult(outlineText);
      setOutlineResultOpen(true);
      setOutlineOpen(false);
      toast.success("Outline generated!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate outline"
      );
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleReorder = async (newSections: ManuscriptSection[]) => {
    setSections(newSections);
    // Persist new order
    const orders = newSections.map((s, i) => ({ id: s.id, orderIndex: i }));
    await fetch(`/api/manuscripts/${manuscriptId}/sections/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/manuscripts/${manuscriptId}/export`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setExportContent(json.data?.content || "");
      setExportOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Export failed"
      );
    } finally {
      setExporting(false);
    }
  };

  const activeSection = sections.find((s) => s.id === activeSectionId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--muted-foreground)]">Manuscript not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
        <div className="flex items-center gap-3">
          <a
            href={`/projects/${projectId}/manuscripts`}
            className="p-1 rounded-lg hover:bg-[var(--secondary)] text-[var(--muted-foreground)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </a>
          <FileText className="h-4 w-4 text-[var(--primary)]" />
          <Input
            value={manuscript.title}
            onChange={async (e) => {
              const newTitle = e.target.value;
              setManuscript({ ...manuscript, title: newTitle });
              await fetch(`/api/manuscripts/${manuscriptId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle }),
              });
            }}
            className="h-8 border-none bg-transparent font-semibold text-[var(--foreground)] focus-visible:ring-0 px-1 w-auto min-w-[200px]"
          />
          <span className="text-xs text-[var(--muted-foreground)]">
            {saving ? "Saving..." : "Saved"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOutlineOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            AI Outline
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || sections.length === 0}
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Export
          </Button>
          <Button size="sm" onClick={() => setNewSectionOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Section
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Section list */}
        <div className="w-56 border-r border-[var(--border)] bg-[var(--card)] overflow-y-auto shrink-0">
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 px-1">
              Sections
            </p>
            <SectionList
              sections={sections}
              activeSectionId={activeSectionId}
              onSelect={setActiveSectionId}
              onDelete={handleDeleteSection}
              onRename={async (id, newTitle) => {
                await fetch(
                  `/api/manuscripts/${manuscriptId}/sections/${id}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: newTitle }),
                  }
                );
                setSections(
                  sections.map((s) =>
                    s.id === id ? { ...s, title: newTitle } : s
                  )
                );
              }}
              onReorder={handleReorder}
            />
          </div>
        </div>

        {/* Center: Editor */}
        <div className="flex-1 overflow-hidden">
          {activeSection ? (
            <ManuscriptEditor
              key={activeSection.id}
              section={activeSection}
              manuscriptId={manuscriptId}
              onSave={handleSaveContent}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--muted-foreground)]">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a section or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Section Dialog — no type dropdown */}
      <Dialog
        open={newSectionOpen}
        onClose={() => setNewSectionOpen(false)}
        title="Add Section"
        description="Name your section — you can add as many as you need."
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Section Title
            </label>
            <Input
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="e.g., Introduction, Methodology"
              className="h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSection();
              }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setNewSectionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSection}
              disabled={!newSectionTitle.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </Dialog>

      {/* AI Outline Input Dialog */}
      <Dialog
        open={outlineOpen}
        onClose={() => setOutlineOpen(false)}
        title="AI Generate Outline"
        description="Describe your research idea and let AI suggest a paper structure."
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Research topic / idea
            </label>
            <textarea
              value={outlineIdea}
              onChange={(e) => setOutlineIdea(e.target.value)}
              placeholder="e.g., Using transformer models for macroeconomic time series forecasting..."
              rows={4}
              className="flex w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOutlineOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateOutline}
              disabled={generatingOutline || !outlineIdea.trim()}
            >
              {generatingOutline && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Generate
            </Button>
          </div>
        </div>
      </Dialog>

      {/* AI Outline Result Dialog — renders markdown */}
      <Dialog
        open={outlineResultOpen}
        onClose={() => setOutlineResultOpen(false)}
        title="Generated Outline"
        description="Use this outline to guide your section creation."
      >
        <div
          className="max-h-96 overflow-y-auto prose prose-sm text-[var(--foreground)] leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: marked.parse(outlineResult || ""),
          }}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => setOutlineResultOpen(false)}
          >
            Close
          </Button>
        </div>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Paper"
        description="Compiled paper from all sections in order."
      >
        <div className="space-y-4">
          <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-[var(--foreground)] leading-relaxed bg-[var(--secondary)] rounded-lg p-4 font-mono">
            {exportContent}
          </pre>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setExportOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(exportContent);
                toast.success("Copied to clipboard");
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
