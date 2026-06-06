"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Manuscript, ManuscriptSection } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  GripVertical,
  Trash2,
  FileText,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ManuscriptEditor } from "@/components/writing/ManuscriptEditor";
import { SectionCard } from "@/components/writing/SectionCard";

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

  // Section creation
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionType, setNewSectionType] = useState("body");

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
    } catch (err) {
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
            sectionType: newSectionType,
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
      toast.success("Outline generated! Use it to guide your sections.");
      setOutlineOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate outline"
      );
    } finally {
      setGeneratingOutline(false);
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
            <div className="space-y-0.5">
              {sections.map((section, index) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={index}
                  isActive={section.id === activeSectionId}
                  onClick={() => setActiveSectionId(section.id)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onRename={async (newTitle) => {
                    await fetch(
                      `/api/manuscripts/${manuscriptId}/sections/${section.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: newTitle }),
                      }
                    );
                    setSections(
                      sections.map((s) =>
                        s.id === section.id
                          ? { ...s, title: newTitle }
                          : s
                      )
                    );
                  }}
                />
              ))}
            </div>
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

      {/* Add Section Dialog */}
      <Dialog
        open={newSectionOpen}
        onClose={() => setNewSectionOpen(false)}
        title="Add Section"
        description="Create a new section in your manuscript."
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
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              Type
            </label>
            <select
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)]"
            >
              <option value="body">Body</option>
              <option value="abstract">Abstract</option>
              <option value="introduction">Introduction</option>
              <option value="related_work">Related Work</option>
              <option value="methodology">Methodology</option>
              <option value="experiments">Experiments</option>
              <option value="conclusion">Conclusion</option>
            </select>
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

      {/* AI Outline Dialog */}
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
    </div>
  );
}
