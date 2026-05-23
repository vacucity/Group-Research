// ===== User =====
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

// ===== Project =====
export type ProjectRole = "OWNER" | "EDITOR" | "VIEWER";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user?: UserProfile;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: { papers: number; members: number };
  members?: ProjectMember[];
  papers?: Paper[];
}

// ===== Paper =====
export interface Paper {
  id: string;
  projectId: string;
  title: string;
  authors: string | null;
  abstract: string | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  pageCount: number | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: PaperTag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface PaperTag {
  id: string;
  paperId: string;
  tagId: string;
  tag?: Tag;
}

// ===== Note =====
export type NoteType = "HIGHLIGHT" | "COMMENT" | "TRANSLATION" | "ANALYSIS" | "FLASHCARD";

export interface Note {
  id: string;
  paperId: string;
  userId: string;
  type: NoteType;
  content: string;
  targetText: string | null;
  pageNumber: number | null;
  boundingBox: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string };
}

// ===== Flashcard =====
export interface Flashcard {
  id: string;
  noteId: string;
  front: string;
  back: string;
  createdAt: string;
  reviews?: FlashcardReview[];
}

export interface FlashcardReview {
  id: string;
  flashcardId: string;
  userId: string;
  score: number;
  reviewedAt: string;
}

// ===== API =====
export interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}
