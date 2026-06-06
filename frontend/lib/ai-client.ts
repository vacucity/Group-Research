const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || "dev-key";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${AI_SERVICE_API_KEY}`,
};

export async function translateText(text: string, targetLang = "zh") {
  const res = await fetch(`${AI_SERVICE_URL}/translate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, target_lang: targetLang }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Translation failed");
  }

  return res.json();
}

export async function analyzeText(text: string, paperContext?: string) {
  const res = await fetch(`${AI_SERVICE_URL}/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, paper_context: paperContext, language: "Chinese" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Analysis failed");
  }

  return res.json();
}

export async function askQuestion(question: string, context: string) {
  const res = await fetch(`${AI_SERVICE_URL}/qa`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question, context }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Q&A failed");
  }

  return res.json();
}

// Streaming versions — returns the raw Response for SSE consumption
export async function streamTranslate(text: string, targetLang = "zh") {
  return fetch(`${AI_SERVICE_URL}/translate/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, target_lang: targetLang }),
  });
}

export async function streamAnalyze(text: string, paperContext?: string) {
  return fetch(`${AI_SERVICE_URL}/analyze/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, paper_context: paperContext, language: "Chinese" }),
  });
}

export async function streamQA(question: string, context: string) {
  return fetch(`${AI_SERVICE_URL}/qa/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question, context }),
  });
}

export async function generateFlashcards(analysis: string) {
  const res = await fetch(`${AI_SERVICE_URL}/flashcards/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ analysis }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Flashcard generation failed");
  }

  return res.json();
}

export async function structureIdea(idea: string, language = "Chinese") {
  const res = await fetch(`${AI_SERVICE_URL}/research/idea-structure`, {
    method: "POST",
    headers,
    body: JSON.stringify({ idea, language }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Idea structuring failed");
  }

  return res.json();
}

export async function generateReviewOutline(
  idea: string,
  papers: string,
  language = "Chinese"
) {
  const res = await fetch(`${AI_SERVICE_URL}/research/review-outline`, {
    method: "POST",
    headers,
    body: JSON.stringify({ idea, papers, language }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Outline generation failed");
  }

  return res.json();
}

export async function searchPapers(query: string, limit = 20) {
  const res = await fetch(`${AI_SERVICE_URL}/research/search-papers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, limit }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Paper search failed");
  }

  return res.json();
}

// ===== Phase 2: AI Writing =====

export async function generateOutline(
  idea: string,
  literature = "",
  venue = "General Conference / Journal",
  language = "Chinese"
) {
  const res = await fetch(`${AI_SERVICE_URL}/write/outline`, {
    method: "POST",
    headers,
    body: JSON.stringify({ idea, literature, venue, language }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Outline generation failed");
  }

  return res.json();
}

export async function writeSection(params: {
  section_title: string;
  section_type?: string;
  action?: string;
  title?: string;
  abstract?: string;
  context?: string;
  literature?: string;
  existing_content?: string;
  language?: string;
}) {
  const res = await fetch(`${AI_SERVICE_URL}/write/section`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      section_title: params.section_title,
      section_type: params.section_type || "body",
      action: params.action || "generate",
      title: params.title || "",
      abstract: params.abstract || "",
      context: params.context || "",
      literature: params.literature || "",
      existing_content: params.existing_content || "",
      language: params.language || "Chinese",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Section writing failed");
  }

  return res.json();
}

export async function suggestCitations(
  text: string,
  literature: string,
  limit = 5
) {
  const res = await fetch(`${AI_SERVICE_URL}/write/citations/suggest`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, literature, limit }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Citation suggestion failed");
  }

  return res.json();
}

export async function detectMissingCitations(
  text: string,
  existingCitations = ""
) {
  const res = await fetch(`${AI_SERVICE_URL}/write/citations/missing`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, existing_citations: existingCitations }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "AI service error" }));
    throw new Error(err.detail || "Missing citation detection failed");
  }

  return res.json();
}
