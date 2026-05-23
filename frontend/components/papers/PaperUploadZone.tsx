"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
  onUploadComplete: () => void;
}

export function PaperUploadZone({ projectId, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);
        const res = await fetch("/api/papers", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Upload failed");
        toast.success("Paper uploaded and parsed successfully");
        onUploadComplete();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [projectId, onUploadComplete]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) handleUpload(acceptedFiles[0]);
    },
    [handleUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
        ${
          isDragActive
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40"
        }
        ${uploading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">
            Uploading and parsing PDF...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-full bg-[var(--primary)]/10">
            <Upload className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">
              Drop a PDF here
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              or click to browse files
            </p>
          </div>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Select PDF file
          </Button>
          <p className="text-[10px] text-[var(--muted-foreground)]/60">
            Supports academic PDFs with metadata extraction
          </p>
        </div>
      )}
    </div>
  );
}
