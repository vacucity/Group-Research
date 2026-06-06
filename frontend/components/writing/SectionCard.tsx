"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ManuscriptSection } from "@/types";
import { GripVertical, Trash2, Check } from "lucide-react";

interface Props {
  section: ManuscriptSection;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => Promise<void>;
}

const statusColors: Record<string, string> = {
  not_started: "bg-gray-200 dark:bg-gray-700",
  drafting: "bg-blue-400",
  reviewing: "bg-yellow-400",
  completed: "bg-green-400",
};

export function SectionCard({
  section,
  index,
  isActive,
  onClick,
  onDelete,
  onRename,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRename = async () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== section.title) {
      await onRename(trimmed);
    }
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
        isActive
          ? "bg-[var(--primary)]/10 text-[var(--primary)]"
          : "hover:bg-[var(--secondary)] text-[var(--foreground)]"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Status dot */}
      <div
        className={`h-2 w-2 rounded-full shrink-0 ${
          statusColors[section.status] || statusColors.not_started
        }`}
      />

      <span className="text-[10px] font-mono text-[var(--muted-foreground)] shrink-0 w-4 text-right">
        {index + 1}
      </span>

      {editing ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent border-b border-[var(--primary)] text-xs outline-none min-w-0"
          autoFocus
        />
      ) : (
        <>
          <div
            className="flex-1 min-w-0"
            onDoubleClick={() => setEditing(true)}
          >
            <p className="text-xs font-medium truncate">{section.title}</p>
          </div>

          {confirmDelete ? (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setConfirmDelete(false);
                }}
                className="p-0.5 rounded text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                title="Confirm delete"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }}
              className="p-0.5 rounded text-[var(--muted-foreground)] hover:text-[var(--destructive)] opacity-0 group-hover:opacity-100 transition-all shrink-0"
              title="Delete section"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
