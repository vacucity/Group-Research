"use client";

import { TopicCluster, ReviewPaper } from "@/types";
import { useState } from "react";
import { ChevronDown, ChevronRight, FolderOpen, Pencil, Trash2 } from "lucide-react";

interface Props {
  cluster: TopicCluster;
  papers: ReviewPaper[];
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

export function ClusterCard({ cluster, papers, onRename, onDelete }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cluster.name);

  const clusterPapers = papers.filter((p) => cluster.paperIds.includes(p.id));

  const handleRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== cluster.name && onRename) {
      onRename(cluster.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--secondary)]/50">
        <button onClick={() => setExpanded(!expanded)} className="text-[var(--muted-foreground)]">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: cluster.color }}
        />
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setEditing(false);
            }}
            className="flex-1 bg-transparent border-b border-[var(--primary)] text-sm font-medium outline-none"
            autoFocus
          />
        ) : (
          <h4
            className="text-sm font-medium text-[var(--foreground)] flex-1 cursor-pointer"
            onDoubleClick={() => setEditing(true)}
          >
            {cluster.name}
          </h4>
        )}
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {clusterPapers.length} papers
        </span>
        {onRename && (
          <button onClick={() => setEditing(true)} className="p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <Pencil className="h-3 w-3" />
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(cluster.id)} className="p-0.5 text-[var(--muted-foreground)] hover:text-red-500">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Papers list */}
      {expanded && (
        <div className="divide-y divide-[var(--border)]">
          {cluster.description && (
            <p className="px-4 py-2 text-xs text-[var(--muted-foreground)] bg-[var(--card)]">
              {cluster.description}
            </p>
          )}
          {clusterPapers.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[var(--muted-foreground)] italic">
              No papers assigned
            </p>
          ) : (
            clusterPapers.map((paper) => (
              <div key={paper.id} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--secondary)]/30">
                <FolderOpen className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
                <span className="text-xs text-[var(--foreground)] truncate">{paper.title}</span>
                {paper.year && (
                  <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">({paper.year})</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
