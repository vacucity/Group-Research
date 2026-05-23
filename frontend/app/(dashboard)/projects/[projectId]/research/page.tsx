"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LatexRenderer } from "@/components/shared/LatexRenderer";
import {
  Loader2,
  Lightbulb,
  Search,
  BookOpen,
  Save,
  Trash2,
  Sparkles,
  FileText,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";

interface Idea {
  id: string;
  rawInput: string;
  structuredOutput: string | null;
  status: string;
  createdAt: string;
  _count?: { candidatePapers: number };
}

interface CandidatePaper {
  id: string;
  ideaId: string;
  title: string;
  authors: string | null;
  abstract: string | null;
  year: number | null;
  citationCount: number | null;
  source: string | null;
  sourceId: string | null;
  relevanceScore: number | null;
  isSaved: boolean;
  userNote: string | null;
}

type Step = "input" | "structure" | "search" | "review";

export default function ResearchPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // Ideas
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(true);

  // Input
  const [rawIdea, setRawIdea] = useState("");
  const [step, setStep] = useState<Step>("input");

  // AI Structuring
  const [structuring, setStructuring] = useState(false);
  const [structuredOutput, setStructuredOutput] = useState("");

  // Paper Search
  const [searching, setSearching] = useState(false);
  const [papers, setPapers] = useState<CandidatePaper[]>([]);

  // Review Outline
  const [generating, setGenerating] = useState(false);
  const [outline, setOutline] = useState("");

  const fetchIdeas = useCallback(() => {
    setLoadingIdeas(true);
    fetch(`/api/projects/${projectId}/ideas`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setIdeas(json.data);
      })
      .finally(() => setLoadingIdeas(false));
  }, [projectId]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const fetchPapers = useCallback(
    (ideaId: string) => {
      fetch(`/api/projects/${projectId}/ideas/${ideaId}/papers`)
        .then((r) => r.json())
        .then((json) => {
          if (json.data) setPapers(json.data);
        })
        .catch(() => {});
    },
    [projectId]
  );

  // Load an existing idea
  const loadIdea = (idea: Idea) => {
    setActiveIdea(idea);
    setRawIdea(idea.rawInput);
    if (idea.structuredOutput) {
      setStructuredOutput(idea.structuredOutput);
      setStep("structure");
    } else {
      setStructuredOutput("");
      setStep("input");
    }
    setOutline("");
    fetchPapers(idea.id);
  };

  // Step 1 → 2: Structure the idea
  const handleStructure = async () => {
    if (!rawIdea.trim() || rawIdea.length < 5) {
      toast.error("Please enter a more detailed research idea");
      return;
    }
    setStructuring(true);
    setStructuredOutput("");
    try {
      const res = await fetch("/api/ai/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "structure", idea: rawIdea }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      const output =
        json.data?.structured_idea || json.structured_idea || "";

      // Save idea to DB
      const saveRes = await fetch(`/api/projects/${projectId}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: rawIdea, structuredOutput: output }),
      });
      const saveJson = await saveRes.json();
      if (saveJson.data) {
        setActiveIdea(saveJson.data);
        setIdeas((prev) => [saveJson.data, ...prev]);
      }

      setStructuredOutput(output);
      setStep("structure");
      toast.success("Idea structured successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Structuring failed");
    } finally {
      setStructuring(false);
    }
  };

  // Step 2 → 3: Search for papers via backend proxy
  const handleSearch = async () => {
    if (!activeIdea) return;
    setSearching(true);
    try {
      const query = rawIdea.substring(0, 200);
      const res = await fetch("/api/papers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Search failed");

      const foundPapers = (json.data?.papers || json.papers || []).map(
        (p: any) => ({
          title: p.title || "Unknown",
          authors: p.authors || null,
          abstract: p.abstract || null,
          year: p.year || null,
          citationCount: p.citationCount || null,
          source: p.source || "semantic_scholar",
          sourceId: p.sourceId || null,
          relevanceScore: 0.8,
        })
      );

      if (foundPapers.length > 0 && activeIdea) {
        const saveRes = await fetch(
          `/api/projects/${projectId}/ideas/${activeIdea.id}/papers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ papers: foundPapers }),
          }
        );
        const saveJson = await saveRes.json();
        if (saveJson.data) {
          setPapers(saveJson.data);
        }
        toast.success(`Found ${foundPapers.length} papers`);
      } else {
        setPapers([]);
        toast.error("No papers found. Try different keywords.");
      }
      setStep("search");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Search failed. Please try again."
      );
      setPapers([]);
    } finally {
      setSearching(false);
    }
  };

  // Import a paper to project library
  const importToLibrary = async (paper: CandidatePaper) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/papers/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract,
          year: paper.year,
          source: paper.source,
          sourceId: paper.sourceId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Import failed");
      toast.success(`"${paper.title}" imported to library`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  };

  // Toggle save/unsave a paper
  const toggleSave = async (paper: CandidatePaper) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/ideas/${activeIdea!.id}/papers`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paperId: paper.id,
            isSaved: !paper.isSaved,
          }),
        }
      );
      const json = await res.json();
      if (json.data) {
        setPapers((prev) =>
          prev.map((p) => (p.id === paper.id ? { ...p, isSaved: !p.isSaved } : p))
        );
      }
    } catch {
      toast.error("Failed to update paper");
    }
  };

  // Step 3 → 4: Generate review outline
  const handleGenerateOutline = async () => {
    if (!activeIdea) return;
    setGenerating(true);
    setOutline("");
    try {
      const savedPapers = papers.filter((p) => p.isSaved);
      const papersText = savedPapers
        .map(
          (p) =>
            `- ${p.title} (${p.year || "?"})\n  ${p.abstract || ""}`
        )
        .join("\n\n");

      const res = await fetch("/api/ai/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "outline",
          idea: rawIdea,
          papers: papersText,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      const output = json.data?.outline || json.outline || "";
      setOutline(output);
      setStep("review");
      toast.success("Review outline generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Outline generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Delete an idea
  const deleteIdea = async (ideaId: string) => {
    await fetch(`/api/projects/${projectId}/ideas?id=${ideaId}`, {
      method: "DELETE",
    });
    if (activeIdea?.id === ideaId) {
      setActiveIdea(null);
      setRawIdea("");
      setStructuredOutput("");
      setPapers([]);
      setOutline("");
      setStep("input");
    }
    setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    toast.success("Idea deleted");
  };

  const savedCount = papers.filter((p) => p.isSaved).length;

  return (
    <div className="max-w-6xl mx-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] tracking-tight">
            AI Research Assistant
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1 text-sm">
            From idea to literature review — structured, step by step
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
        {/* Left Sidebar — Idea History */}
        <div className="lg:col-span-1 overflow-auto space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/60 px-1">
            Research Ideas
          </h3>
          {loadingIdeas ? (
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          ) : ideas.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] px-1">
              No ideas yet. Start by entering your research idea.
            </p>
          ) : (
            ideas.map((idea) => (
              <div
                key={idea.id}
                onClick={() => loadIdea(idea)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && loadIdea(idea)}
                className={clsx(
                  "w-full text-left p-3 rounded-lg border transition-all text-sm cursor-pointer",
                  activeIdea?.id === idea.id
                    ? "border-[var(--primary)]/40 bg-[var(--primary)]/5"
                    : "border-[var(--border)] hover:border-[var(--primary)]/20 bg-[var(--card)]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-[var(--foreground)] truncate">
                    {idea.rawInput}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteIdea(idea.id);
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-[var(--destructive)]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {idea.status}
                  </Badge>
                  {idea._count && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {idea._count.candidatePapers} papers
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 overflow-auto space-y-6">
          {/* Step 1: Idea Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Step 1: Your Research Idea
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={rawIdea}
                onChange={(e) => setRawIdea(e.target.value)}
                placeholder="Describe your research idea... e.g. Transformer models for macroeconomic forecasting or AI-driven drug discovery for neurodegenerative diseases"
                rows={3}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/30"
              />
              <Button
                onClick={handleStructure}
                disabled={structuring || rawIdea.trim().length < 5}
                className="w-full"
              >
                {structuring ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Structure My Idea
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Structured Idea */}
          {structuredOutput && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                  Step 2: Structured Research Direction
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearch}
                  disabled={searching || !activeIdea}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search Papers
                </Button>
              </CardHeader>
              <CardContent>
                <LatexRenderer
                  className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  text={structuredOutput}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Candidate Papers */}
          {step === "search" && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-500" />
                  Step 3: Candidate Papers ({papers.length})
                  {savedCount > 0 && (
                    <Badge variant="default" className="text-[10px]">
                      {savedCount} saved
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSearch}
                    disabled={searching}
                  >
                    <Search className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                  {savedCount > 0 && (
                    <Button
                      size="sm"
                      onClick={handleGenerateOutline}
                      disabled={generating}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Generate Review
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {papers.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                    No papers found. Try refining your search keywords.
                  </p>
                ) : (
                  papers.map((paper) => (
                    <PaperRow
                      key={paper.id}
                      paper={paper}
                      onToggleSave={() => toggleSave(paper)}
                      onImport={importToLibrary}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review Outline */}
          {outline && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-500" />
                  Step 4: Literature Review Outline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LatexRenderer
                  className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  text={outline}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Single paper row component
function PaperRow({
  paper,
  onToggleSave,
  onImport,
}: {
  paper: CandidatePaper;
  onToggleSave: () => void;
  onImport: (paper: CandidatePaper) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={clsx(
        "p-3 rounded-lg border transition-all",
        paper.isSaved
          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/20"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggleSave}
          className="shrink-0 mt-0.5"
          title={
            paper.isSaved ? "Remove from collection" : "Save to collection"
          }
        >
          {paper.isSaved ? (
            <BookmarkCheck className="h-4 w-4 text-[var(--primary)]" />
          ) : (
            <Bookmark className="h-4 w-4 text-[var(--muted-foreground)] hover:text-[var(--primary)]" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm text-[var(--foreground)] leading-snug">
              {paper.title}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {paper.year && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  {paper.year}
                </span>
              )}
              {paper.citationCount != null && paper.citationCount > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {paper.citationCount} cites
                </Badge>
              )}
            </div>
          </div>
          {paper.authors && (
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {paper.authors}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {paper.abstract && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    <ChevronDown className="h-3 w-3" /> Hide abstract
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3 w-3" /> Show abstract
                  </>
                )}
              </button>
            )}
            {paper.sourceId && (
              <a
                href={`https://www.semanticscholar.org/paper/${paper.sourceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-[var(--primary)] hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> View
              </a>
            )}
            <button
              onClick={() => onImport(paper)}
              className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline"
              title="Import to project library"
            >
              <Save className="h-3 w-3" /> Import to Library
            </button>
          </div>
          {expanded && paper.abstract && (
            <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed bg-[var(--muted)] p-2 rounded">
              {paper.abstract}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
