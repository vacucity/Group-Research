"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ReviewWorkspace, ReviewPaper, TopicCluster } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { PaperCard } from "@/components/review/PaperCard";
import { ClusterCard } from "@/components/review/ClusterCard";
import {
  Loader2,
  Plus,
  BookOpen,
  ChevronLeft,
  Upload,
  Link as LinkIcon,
  Sparkles,
  FileText,
  Layers,
  Play,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Download,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "papers" | "clusters" | "gaps" | "evolution" | "conflicts" | "outline" | "compare";

export default function ReviewWorkspacePage() {
  const { id: workspaceId } = useParams<{ id: string }>();

  const [workspace, setWorkspace] = useState<ReviewWorkspace | null>(null);
  const [papers, setPapers] = useState<ReviewPaper[]>([]);
  const [clusters, setClusters] = useState<TopicCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("papers");

  // Paper add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [paperTitle, setPaperTitle] = useState("");
  const [paperAuthors, setPaperAuthors] = useState("");
  const [paperAbstract, setPaperAbstract] = useState("");
  const [paperYear, setPaperYear] = useState("");
  const [adding, setAdding] = useState(false);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importType, setImportType] = useState<"doi" | "arxiv" | "bibtex">("doi");
  const [importValue, setImportValue] = useState("");
  const [importing, setImporting] = useState(false);

  // Cluster loading
  const [clustering, setClustering] = useState(false);

  // Parsing
  const [parsingId, setParsingId] = useState<string | null>(null);

  // Pipeline
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState("");
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineTotal, setPipelineTotal] = useState(5);
  const [pipelineResult, setPipelineResult] = useState<{
    gaps: Array<Record<string, unknown>>;
    drafts: Array<Record<string, unknown>>;
  } | null>(null);
  const [pipelineError, setPipelineError] = useState("");

  const fetchData = useCallback(() => {
    fetch(`/api/reviews/${workspaceId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setWorkspace(json.data);
          setPapers(json.data.papers || []);
          setClusters(json.data.clusters || []);
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPaper = async () => {
    if (!paperTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/reviews/${workspaceId}/papers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paperTitle.trim(),
          authors: paperAuthors.trim(),
          abstract: paperAbstract.trim(),
          year: paperYear ? parseInt(paperYear) : null,
          source: "manual",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setPapers([json.data, ...papers]);
      setAddOpen(false);
      setPaperTitle("");
      setPaperAuthors("");
      setPaperAbstract("");
      setPaperYear("");
      toast.success("Paper added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add paper");
    } finally {
      setAdding(false);
    }
  };

  const handleImport = async () => {
    if (!importValue.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/reviews/${workspaceId}/papers/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: importType, value: importValue.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setPapers([json.data, ...papers]);
      setImportOpen(false);
      setImportValue("");
      toast.success("Paper imported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    try {
      await fetch(`/api/reviews/${workspaceId}/papers/${paperId}`, { method: "DELETE" });
      setPapers(papers.filter((p) => p.id !== paperId));
      toast.success("Paper removed");
    } catch {
      toast.error("Failed to delete paper");
    }
  };

  const handleParsePaper = async (paperId: string) => {
    setParsingId(paperId);
    try {
      const paper = papers.find((p) => p.id === paperId);
      if (!paper) return;

      // Update status to parsing
      setPapers(papers.map((p) => (p.id === paperId ? { ...p, status: "parsing" } : p)));

      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse",
          title: paper.title,
          authors: paper.authors || "",
          abstract: paper.abstract || "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Parse failed");

      const memory = parseAIJson(json.data?.memory || "");

      // Persist parsed memory
      await fetch(`/api/reviews/${workspaceId}/papers/${paperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedMemory: JSON.stringify(memory), status: "parsed" }),
      });

      setPapers(
        papers.map((p) =>
          p.id === paperId ? { ...p, parsedMemory: memory as unknown as ReviewPaper["parsedMemory"], status: "parsed" as const } : p
        )
      );
      toast.success("Paper parsed");
    } catch (err) {
      setPapers(papers.map((p) => (p.id === paperId ? { ...p, status: "error" } : p)));
      toast.error(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsingId(null);
    }
  };

  const handleAutoCluster = async () => {
    if (papers.length < 3) {
      toast.error("Need at least 3 papers to cluster");
      return;
    }
    setClustering(true);
    try {
      const res = await fetch(`/api/reviews/${workspaceId}/clusters`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setClusters(json.data || []);
      toast.success(`Created ${json.data?.length || 0} topic clusters`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clustering failed");
    } finally {
      setClustering(false);
    }
  };

  const handleDeleteCluster = async (clusterId: string) => {
    try {
      await fetch(`/api/reviews/${workspaceId}/clusters/${clusterId}`, { method: "DELETE" });
      setClusters(clusters.filter((c) => c.id !== clusterId));
      toast.success("Cluster deleted");
    } catch {
      toast.error("Failed to delete cluster");
    }
  };

  const runPipeline = async () => {
    if (papers.length < 3) {
      toast.error("Need at least 3 papers to run the pipeline");
      return;
    }
    setPipelineRunning(true);
    setPipelineStep("Starting pipeline...");
    setPipelineProgress(0);
    setPipelineError("");
    setPipelineResult(null);

    try {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pipeline",
          workspace_id: workspaceId,
          papers: JSON.stringify(
            papers.map((p) => ({
              id: p.id,
              title: p.title,
              authors: p.authors || "",
              abstract: p.abstract || "",
              year: p.year,
            }))
          ),
          metadata: JSON.stringify({
            workspace_name: workspace?.name || "",
            research_field: workspace?.researchField || "",
            review_type: workspace?.reviewType || "survey",
            language: "Chinese",
          }),
        }),
      });

      if (!res.ok) throw new Error("Pipeline request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              const { event, data } = parsed;

              if (event === "step") {
                setPipelineStep(data.step || data.current_step || "");
              } else if (event === "progress") {
                setPipelineStep(data.label || "");
                setPipelineProgress(data.index || 0);
                setPipelineTotal(data.total || 5);
              } else if (event === "complete") {
                setPipelineResult({
                  gaps: data.research_gaps || [],
                  drafts: data.section_drafts || [],
                });
                setPipelineProgress(data.total || 5);
                toast.success(
                  `Pipeline complete: ${data.gap_count || 0} gaps, ${data.draft_count || 0} drafts`
                );
              } else if (event === "error") {
                setPipelineError(data.message || "Unknown error");
                toast.error(data.message || "Pipeline error");
              }
            } catch {
              // skip parse errors
            }
          }
        }
      }
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Pipeline failed");
      toast.error(err instanceof Error ? err.message : "Pipeline failed");
    } finally {
      setPipelineRunning(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "papers", label: "Papers", icon: <FileText className="h-4 w-4" />, count: papers.length },
    { key: "clusters", label: "Clusters", icon: <Layers className="h-4 w-4" />, count: clusters.length },
    { key: "evolution", label: "Evolution", icon: <GitBranch className="h-4 w-4" /> },
    { key: "gaps", label: "Gaps", icon: <Sparkles className="h-4 w-4" /> },
    { key: "conflicts", label: "Conflicts", icon: <AlertTriangle className="h-4 w-4" /> },
    { key: "outline", label: "Outline", icon: <BookOpen className="h-4 w-4" /> },
    { key: "compare", label: "Export", icon: <Download className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--muted-foreground)]">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <a
            href="/reviews"
            className="p-1 rounded-lg hover:bg-[var(--secondary)] text-[var(--muted-foreground)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </a>
          <BookOpen className="h-5 w-5 text-[var(--primary)]" />
          <h1 className="text-xl font-semibold text-[var(--foreground)]">{workspace.name}</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)]">
            {workspace.reviewType}
          </span>
        </div>
        <Button
          onClick={runPipeline}
          disabled={pipelineRunning || papers.length < 3}
          variant="default"
          size="sm"
        >
          {pipelineRunning ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {pipelineRunning ? "Running..." : "Run Pipeline"}
        </Button>
      </div>

      {/* Pipeline progress */}
      {pipelineRunning && (
        <div className="mb-6 p-4 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">{pipelineStep}</p>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--secondary)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
              style={{ width: `${((pipelineProgress / pipelineTotal) * 100).toFixed(0)}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-1.5">
            Step {pipelineProgress} of {pipelineTotal}
          </p>
        </div>
      )}

      {/* Pipeline error */}
      {pipelineError && !pipelineRunning && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{pipelineError}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] px-1 py-0.5 rounded-full bg-[var(--secondary)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Papers Tab */}
      {activeTab === "papers" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Paper
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Import
            </Button>
          </div>

          {papers.length === 0 ? (
            <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-[var(--border)]">
              <FileText className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
              <p className="text-sm text-[var(--muted-foreground)]">
                Add papers to your workspace to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {papers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onDelete={handleDeletePaper}
                  onParse={handleParsePaper}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clusters Tab */}
      {activeTab === "clusters" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button
              size="sm"
              onClick={handleAutoCluster}
              disabled={clustering || papers.length < 3}
            >
              {clustering ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Auto Cluster
            </Button>
            <span className="text-xs text-[var(--muted-foreground)]">
              {papers.length < 3
                ? "Need 3+ papers"
                : `${papers.length} papers available`}
            </span>
          </div>

          {clusters.length === 0 ? (
            <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-[var(--border)]">
              <Layers className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
              <p className="text-sm text-[var(--muted-foreground)]">
                Add papers and click "Auto Cluster" to group them by topic
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {clusters.map((cluster) => {
                // Parse paperIds from stored JSON
                const paperIds: string[] = typeof cluster.paperIds === "string"
                  ? JSON.parse(cluster.paperIds)
                  : cluster.paperIds || [];
                const enrichedCluster = { ...cluster, paperIds };
                return (
                  <ClusterCard
                    key={cluster.id}
                    cluster={enrichedCluster}
                    papers={papers}
                    onDelete={handleDeleteCluster}
                    onRename={async (id, name) => {
                      await fetch(`/api/reviews/${workspaceId}/clusters/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name }),
                      });
                      setClusters(
                        clusters.map((c) => (c.id === id ? { ...c, name } : c))
                      );
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Evolution Tab */}
      {activeTab === "evolution" && (
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Method evolution timeline — papers ordered by year
          </p>
          <EvolutionTab workspaceId={workspaceId} />
        </div>
      )}

      {/* Gaps Tab */}
      {activeTab === "gaps" && (
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Research gaps discovered by AI analysis
          </p>
          <GapsTab workspaceId={workspaceId} />
        </div>
      )}

      {/* Conflicts Tab */}
      {activeTab === "conflicts" && (
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Potential contradictions between paper findings
          </p>
          <ConflictsTab workspaceId={workspaceId} />
        </div>
      )}

      {/* Outline Tab */}
      {activeTab === "outline" && (
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Review outline — AI-generated or manually created
          </p>
          <OutlineTab workspaceId={workspaceId} />
        </div>
      )}

      {/* Compare/Export Tab */}
      {activeTab === "compare" && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted-foreground)]">
            Export your review in different formats
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { fmt: "md", label: "Markdown", desc: "Universal text format" },
              { fmt: "csv", label: "CSV", desc: "Sections metadata" },
              { fmt: "latex", label: "LaTeX", desc: "Compilable .tex file" },
            ].map(({ fmt, label, desc }) => (
              <a
                key={fmt}
                href={`/api/reviews/${workspaceId}/export?format=${fmt}`}
                className="p-4 rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/30 bg-[var(--card)] text-center transition-colors cursor-pointer"
              >
                <Download className="h-5 w-5 mx-auto mb-2 text-[var(--primary)]" />
                <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">{desc}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Add Paper Dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Paper"
        description="Manually add a paper to the workspace."
      >
        <div className="space-y-4">
          <Input
            value={paperTitle}
            onChange={(e) => setPaperTitle(e.target.value)}
            placeholder="Paper title *"
            className="h-11"
          />
          <Input
            value={paperAuthors}
            onChange={(e) => setPaperAuthors(e.target.value)}
            placeholder="Authors (e.g. Vaswani et al.)"
            className="h-11"
          />
          <Input
            value={paperYear}
            onChange={(e) => setPaperYear(e.target.value)}
            placeholder="Year (e.g. 2017)"
            className="h-11"
            type="number"
          />
          <textarea
            value={paperAbstract}
            onChange={(e) => setPaperAbstract(e.target.value)}
            placeholder="Abstract"
            rows={3}
            className="flex w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm resize-none"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPaper} disabled={adding || !paperTitle.trim()}>
              {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Paper"
        description="Import by DOI, arXiv ID, or BibTeX."
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["doi", "arxiv", "bibtex"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setImportType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  importType === t
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          {importType === "bibtex" ? (
            <textarea
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
              placeholder="Paste BibTeX entry..."
              rows={6}
              className="flex w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-mono resize-none"
            />
          ) : (
            <Input
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
              placeholder={
                importType === "doi"
                  ? "10.xxxx/xxxxx"
                  : importType === "arxiv"
                  ? "2312.xxxxx or arxiv URL"
                  : ""
              }
              className="h-11 font-mono text-sm"
            />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing || !importValue.trim()}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Import
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// --- Tab Components ---

function EvolutionTab({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<Array<{ id: string; title: string; year: number; method: string; contribution: string }>>([]);
  useEffect(() => {
    fetch(`/api/reviews/${workspaceId}/evolution`)
      .then(r => r.json()).then(j => setData(j.data?.papers || []));
  }, [workspaceId]);
  if (!data.length) return <p className="text-sm text-[var(--muted-foreground)]">No parsed papers with year data yet.</p>;
  return (
    <div className="space-y-3">
      {data.map((p, i) => (
        <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="h-8 w-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0 text-xs font-bold text-[var(--primary)]">{p.year}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)]">{p.title}</p>
            {p.method && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Method: {p.method}</p>}
          </div>
          {i < data.length - 1 && (
            <div className="h-full w-px bg-[var(--border)] absolute left-4 top-8" />
          )}
        </div>
      ))}
    </div>
  );
}

function GapsTab({ workspaceId }: { workspaceId: string }) {
  const [gaps, setGaps] = useState<Array<{ id: string; title: string; description: string; confidence: number; status: string }>>([]);
  useEffect(() => {
    fetch(`/api/reviews/${workspaceId}`).then(r => r.json()).then(j => {
      if (j.data?.gaps) setGaps(j.data.gaps);
    });
  }, [workspaceId]);
  if (!gaps.length) return <p className="text-sm text-[var(--muted-foreground)]">No gaps discovered yet. Run the pipeline to find research gaps.</p>;
  return (
    <div className="space-y-3">
      {gaps.map((g) => (
        <div key={g.id} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-[var(--foreground)]">{g.title}</h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${g.status === "open" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>{g.status}</span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-2">{g.description}</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--muted-foreground)]">Confidence: {(g.confidence * 100).toFixed(0)}%</span>
            <button
              onClick={async () => {
                await fetch(`/api/reviews/${workspaceId}/gaps/${g.id}/reject`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reason: "Not relevant" }),
                });
                setGaps(gaps.map(g2 => g2.id === g.id ? { ...g2, status: "resolved" } : g2));
                toast.success("Gap rejected");
              }}
              className="text-[10px] text-red-500 hover:underline"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConflictsTab({ workspaceId }: { workspaceId: string }) {
  const [conflicts, setConflicts] = useState<Array<{ title: string; paperA: string; paperB: string; detail: string; severity: string }>>([]);
  useEffect(() => {
    fetch(`/api/reviews/${workspaceId}/conflicts`)
      .then(r => r.json()).then(j => setConflicts(j.data || []));
  }, [workspaceId]);
  if (!conflicts.length) return <p className="text-sm text-[var(--muted-foreground)]">No conflicts detected between papers.</p>;
  return (
    <div className="space-y-3">
      {conflicts.map((c, i) => (
        <div key={i} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`h-4 w-4 ${c.severity === "major" ? "text-red-500" : "text-yellow-500"}`} />
            <h4 className="text-sm font-medium text-[var(--foreground)]">{c.title}</h4>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">{c.detail}</p>
          <div className="flex gap-4 mt-2">
            <span className="text-[10px] text-[var(--muted-foreground)]">Paper A: {c.paperA.substring(0, 50)}</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">Paper B: {c.paperB.substring(0, 50)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OutlineTab({ workspaceId }: { workspaceId: string }) {
  const [outline, setOutline] = useState<Array<{ id: string; title: string; orderIndex: number; sectionType: string }>>([]);
  useEffect(() => {
    fetch(`/api/reviews/${workspaceId}`).then(r => r.json()).then(j => {
      if (j.data?.outline) setOutline(j.data.outline);
    });
  }, [workspaceId]);
  if (!outline.length) return <p className="text-sm text-[var(--muted-foreground)]">No outline yet. Run the pipeline to generate one.</p>;
  return (
    <div className="space-y-2">
      {outline.sort((a, b) => a.orderIndex - b.orderIndex).map((o) => (
        <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <span className="text-[10px] font-mono text-[var(--muted-foreground)] w-5">{o.orderIndex + 1}</span>
          <BookOpen className="h-4 w-4 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--foreground)]">{o.title}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] ml-auto">{o.sectionType}</span>
        </div>
      ))}
    </div>
  );
}

function parseAIJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return { contribution: raw, method: "", dataset: "", metric: "", limitation: "", future_work: "", keywords: [] };
  }
}
