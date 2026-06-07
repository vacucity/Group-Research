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

// ===== Phase 2: Manuscript =====
export type ManuscriptStatus = "draft" | "writing" | "reviewing" | "completed";
export type SectionType = "abstract" | "introduction" | "related_work" | "methodology" | "experiments" | "conclusion" | "body";
export type SectionStatus = "not_started" | "drafting" | "reviewing" | "completed";

export interface Manuscript {
  id: string;
  projectId: string;
  title: string;
  abstract: string | null;
  status: ManuscriptStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sections?: ManuscriptSection[];
  citations?: ManuscriptCitation[];
  _count?: { sections: number; citations: number };
}

export interface ManuscriptSection {
  id: string;
  manuscriptId: string;
  title: string;
  content: Record<string, unknown>; // TipTap JSON (WYSIWYG mode)
  contentMode: "wysiwyg" | "latex";
  latexContent: string | null; // LaTeX source (latex mode)
  orderIndex: number;
  sectionType: SectionType;
  assignedTo: string | null;
  status: SectionStatus;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string; avatarUrl?: string | null };
}

export interface ManuscriptCitation {
  id: string;
  manuscriptId: string;
  paperId: string | null;
  title: string;
  authors: string | null;
  year: number | null;
  source: string | null;
  sourceId: string | null;
  citationKey: string;
  orderIndex: number;
  createdAt: string;
  paper?: Paper;
}

export interface ManuscriptComment {
  id: string;
  manuscriptId: string;
  sectionId: string | null;
  userId: string;
  content: string;
  type: string;
  resolvedAt: string | null;
  anchoredTo: string | null;
  createdAt: string;
  updatedAt: string;
  user?: UserProfile;
}

export interface ManuscriptReview {
  id: string;
  manuscriptId: string;
  sectionId: string | null;
  userId: string;
  type: string;
  content: Record<string, unknown>;
  status: string;
  createdAt: string;
}

// ===== Phase 2.5: ReviewOS =====

export type ReviewType = "survey" | "related_work" | "systematic" | "comparative";
export type ReviewMemberRole = "OWNER" | "EDITOR" | "COMMENTATOR" | "VIEWER";
export type ReviewPaperStatus = "pending" | "parsing" | "parsed" | "error";
export type GapStatus = "open" | "investigating" | "resolved";

export interface ReviewWorkspace {
  id: string;
  name: string;
  researchField: string | null;
  reviewType: ReviewType;
  targetVenue: string | null;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: { papers: number; clusters: number; gaps: number; sections: number };
  owner?: UserProfile;
  papers?: ReviewPaper[];
  clusters?: TopicCluster[];
}

export interface ReviewMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: ReviewMemberRole;
  joinedAt: string;
  user?: UserProfile;
}

export interface ReviewPaper {
  id: string;
  workspaceId: string;
  title: string;
  authors: string | null;
  abstract: string | null;
  year: number | null;
  source: string | null;
  sourceId: string | null;
  fileName: string | null;
  filePath: string | null;
  fileSize: number | null;
  status: ReviewPaperStatus;
  parsedMemory: PaperMemory | null;
  addedAt: string;
}

export interface PaperMemory {
  contribution: string;
  method: string;
  dataset: string;
  metric: string;
  limitation: string;
  futureWork: string;
  keywords: string[];
}

export interface TopicCluster {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string;
  paperIds: string[]; // parsed from JSON string
  createdAt: string;
}

export interface ResearchGap {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  confidence: number;
  evidence: GapEvidence[] | null;
  status: GapStatus;
  createdAt: string;
}

export interface GapEvidence {
  paperId: string;
  paperTitle: string;
  quote: string;
}

export interface ReviewOutlineItem {
  id: string;
  workspaceId: string;
  title: string;
  parentId: string | null;
  orderIndex: number;
  sectionType: string;
  createdAt: string;
}

export interface ReviewSection {
  id: string;
  workspaceId: string;
  title: string;
  content: Record<string, unknown>;
  orderIndex: number;
  assignedTo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonTable {
  id: string;
  workspaceId: string;
  title: string;
  columns: TableColumn[];
  rows: TableRow[];
  createdAt: string;
}

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  paperTitle: string;
  cells: Record<string, string>;
}

// ===== Part 4: Memory Layer =====

export interface PaperSection {
  id: string;
  paperId: string;
  sectionName: string;
  content: string;
  chunkOrder: number;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  workspaceId: string;
  agentName: string;
  status: "running" | "completed" | "failed";
  input: string | null;
  output: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ReviewVersion {
  id: string;
  workspaceId: string;
  versionNumber: number;
  label: string | null;
  snapshotPath: string | null;
  snapshotData: string | null;
  createdBy: string;
  createdAt: string;
}

// ===== API =====
export interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}
