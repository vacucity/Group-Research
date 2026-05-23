import { Note } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Highlighter, MessageCircle, Languages, Brain, Zap, Trash2 } from "lucide-react";
import { format } from "date-fns";

const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: "default" | "secondary" | "outline" | "destructive" }> = {
  HIGHLIGHT: { icon: <Highlighter className="h-3 w-3" />, label: "Highlight", color: "default" },
  COMMENT: { icon: <MessageCircle className="h-3 w-3" />, label: "Comment", color: "secondary" },
  TRANSLATION: { icon: <Languages className="h-3 w-3" />, label: "Translation", color: "outline" },
  ANALYSIS: { icon: <Brain className="h-3 w-3" />, label: "Analysis", color: "secondary" },
  FLASHCARD: { icon: <Zap className="h-3 w-3" />, label: "Flashcard", color: "default" },
};

interface Props {
  note: Note;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, onDelete }: Props) {
  const config = typeConfig[note.type] || typeConfig.COMMENT;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant={config.color}>
              <span className="flex items-center gap-1">
                {config.icon}
                {config.label}
              </span>
            </Badge>
            <span className="text-xs text-muted-foreground">
              {note.user?.name} · {format(new Date(note.createdAt), "MMM d, yyyy")}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>

        {note.targetText && (
          <div className="mb-2 p-2 bg-muted rounded text-xs text-muted-foreground line-clamp-3 italic">
            &ldquo;{note.targetText}&rdquo;
          </div>
        )}

        {note.content && (
          <div className="text-sm whitespace-pre-wrap">{note.content}</div>
        )}
      </CardContent>
    </Card>
  );
}
