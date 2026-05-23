"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Note } from "@/types";
import { NoteCard } from "@/components/notes/NoteCard";
import { Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";

export default function NotesPage() {
  const { paperId } = useParams<{ paperId: string }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/papers/${paperId}/notes`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setNotes(json.data);
      })
      .finally(() => setLoading(false));
  }, [paperId]);

  const handleDelete = async (noteId: string) => {
    try {
      await fetch(`/api/papers/${paperId}/notes/${noteId}`, { method: "DELETE" });
      setNotes(notes.filter((n) => n.id !== noteId));
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notes</h1>

      {notes.length === 0 ? (
        <div className="text-center py-16">
          <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No notes yet</h3>
          <p className="text-muted-foreground">
            Select text in the PDF reader to create highlights, translations, and analysis notes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
