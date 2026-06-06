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
} from "lucide-react";
import { toast } from "sonner";

type Tab = "papers" | "clusters" | "gaps" | "outline" | "compare";

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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "papers", label: "Papers", icon: <FileText className="h-4 w-4" />, count: papers.length },
    { key: "clusters", label: "Clusters", icon: <Layers className="h-4 w-4" />, count: clusters.length },
    { key: "gaps", label: "Gaps", icon: <Sparkles className="h-4 w-4" /> },
    { key: "outline", label: "Outline", icon: <BookOpen className="h-4 w-4" /> },
    { key: "compare", label: "Compare", icon: <FileText className="h-4 w-4" /> },
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
      </div>

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

      {/* Gaps / Outline / Compare Tabs (placeholder for future parts) */}
      {activeTab === "gaps" && (
        <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
          <p className="text-sm text-[var(--muted-foreground)]">Gap discovery — coming in Part 2</p>
        </div>
      )}
      {activeTab === "outline" && (
        <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
          <p className="text-sm text-[var(--muted-foreground)]">Outline generation — coming in Part 2</p>
        </div>
      )}
      {activeTab === "compare" && (
        <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <FileText className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
          <p className="text-sm text-[var(--muted-foreground)]">Comparison table — coming in Part 2</p>
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
