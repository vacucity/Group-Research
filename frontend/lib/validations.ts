import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(1000).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const createNoteSchema = z.object({
  type: z.enum(["HIGHLIGHT", "COMMENT", "TRANSLATION", "ANALYSIS", "FLASHCARD"]),
  content: z.string().min(1),
  targetText: z.string().optional(),
  pageNumber: z.number().int().positive().optional(),
  boundingBox: z.string().optional(),
  metadata: z.string().optional(),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
});

export const translateRequestSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000),
  targetLang: z.string().default("zh"),
});

export const analyzeRequestSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000),
  paper_context: z.string().optional(),
  language: z.string().max(50).optional(),
});

export const qaRequestSchema = z.object({
  question: z.string().min(1, "Question is required").max(4000),
  context: z.string(),
  title_abstract: z.string().optional(),
});
