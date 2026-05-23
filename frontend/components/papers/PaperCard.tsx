import Link from "next/link";
import { Paper } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  paper: Paper;
  projectId: string;
  onDelete: (paper: Paper) => void;
}

export function PaperCard({ paper, projectId, onDelete }: Props) {
  return (
    <Card className="group transition-all hover:border-[var(--primary)]/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/projects/${projectId}/papers/${paper.id}`}
            className="flex-1 min-w-0"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                <FileText className="h-3.5 w-3.5 text-[var(--primary)]" />
              </div>
              <h3 className="font-medium text-sm text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">
                {paper.title}
              </h3>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">
              {paper.authors || "Unknown authors"} · {paper.pageCount || "?"}{" "}
              pages
            </p>
            {paper.abstract && (
              <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mb-2 leading-relaxed">
                {paper.abstract}
              </p>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 shrink-0 hover:bg-[var(--destructive)]/10"
            onClick={(e) => {
              e.preventDefault();
              onDelete(paper);
            }}
          >
            <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
          </Button>
        </div>

        {paper.tags && paper.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {paper.tags.map((pt) => (
              <Badge key={pt.id} variant="outline" className="text-[10px]">
                {pt.tag?.name}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-2.5">
          Added {format(new Date(paper.createdAt), "MMM d, yyyy")}
        </p>
      </CardContent>
    </Card>
  );
}
