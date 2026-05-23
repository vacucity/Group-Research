"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Paper } from "@/types";
import { PaperUploadZone } from "@/components/papers/PaperUploadZone";
import { PaperCard } from "@/components/papers/PaperCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Search, Loader2, Library } from "lucide-react";
import { toast } from "sonner";

export default function PapersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Paper | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPapers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ projectId });
    if (search) params.set("search", search);
    fetch(`/api/papers?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setPapers(json.data);
      })
      .finally(() => setLoading(false));
  }, [projectId, search]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/papers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setPapers(papers.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Paper deleted");
    } catch {
      toast.error("Failed to delete paper");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] tracking-tight">
            Literature Library
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1 text-sm">
            Upload and manage research papers
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search papers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      <div className="mb-8">
        <PaperUploadZone projectId={projectId} onUploadComplete={fetchPapers} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : papers.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-4">
            <Library className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-1">
            No papers yet
          </h3>
          <p className="text-[var(--muted-foreground)] text-sm">
            Drop a PDF above to add your first paper
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              projectId={projectId}
              onDelete={(paper) => setDeleteTarget(paper)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Paper"
      >
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          Are you sure you want to delete{" "}
          <strong className="text-[var(--foreground)]">
            {deleteTarget?.title}
          </strong>
          ? This will also remove all associated notes and the PDF file.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
