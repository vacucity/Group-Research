"""ReviewOS AI router — knowledge extraction, clustering, gap discovery, outlines."""

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from ..services.llm_client import reason_llm

router = APIRouter()

# ===== Prompt templates =====

PAPER_PARSE_PROMPT = """You are an expert academic paper analyzer. Extract structured knowledge from the following paper.

Paper content:
Title: {title}
Authors: {authors}
Abstract: {abstract}

Extract the following fields in JSON format. Be specific and concise. Return ONLY the JSON, no meta-commentary.

Required fields:
- contribution: The main contribution of this paper (1-2 sentences)
- method: The key method or approach proposed (1-2 sentences)
- dataset: Datasets used for evaluation (list if multiple, "None" if not applicable)
- metric: Key evaluation metrics reported (e.g., "BLEU 28.5, ROUGE 42.1")
- limitation: Limitations acknowledged by authors or obvious from the work (1-2 sentences)
- future_work: Suggested future work or open questions (1-2 sentences)
- keywords: 3-6 keywords describing the paper

Output as a JSON object with these exact keys. Example:
{{"contribution": "...", "method": "...", "dataset": "...", "metric": "...", "limitation": "...", "future_work": "...", "keywords": ["k1", "k2"]}}"""

TOPIC_CLUSTER_PROMPT = """You are a research topic analysis system. Given a list of papers, group them into meaningful topic clusters.

Papers (title, abstract, keywords):
{papers}

Task:
1. Identify 3-6 distinct topic clusters relevant to this research area
2. Assign each paper to the most appropriate cluster
3. Provide a descriptive name and brief explanation for each cluster

Return ONLY a JSON array. Each cluster should have:
- name: Short cluster name (e.g., "Transformer-based Methods")
- description: 1-sentence description of this cluster
- paper_titles: Array of paper titles belonging to this cluster
- color: A hex color code from this palette: ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"]

Example:
[{{"name": "...", "description": "...", "paper_titles": ["Paper A", "Paper B"], "color": "#6366f1"}}]"""

RESEARCH_GAP_PROMPT = """You are a research gap discovery system. Analyze the following paper collection and identify research gaps.

Papers (title, contribution, limitation):
{papers}

Identify 3-6 genuine research gaps. For each gap, provide:
- title: A short name for the gap
- description: 2-3 sentences describing the gap and why it matters
- confidence: A score from 0.0 to 1.0 indicating how confident you are this is a real gap
- evidence_papers: Paper titles from the collection that support this gap (1-3 papers)
- evidence_quotes: Specific quotes or paraphrases from those papers that indicate the gap

Return ONLY a JSON array:
[{{"title": "...", "description": "...", "confidence": 0.8, "evidence_papers": ["Paper 1"], "evidence_quotes": ["..."]}}]"""

COMPARISON_TABLE_PROMPT = """You are an academic comparison system. Generate a structured comparison table from the following papers.

Papers (title, method, dataset, metric):
{papers}

Generate a comparison table with:
- columns: Array of column definitions (key + label). Include at minimum: Paper, Method, Dataset, Key Metric
- rows: Array of row objects with paperTitle and cells (key-value map matching column keys)

Return ONLY a JSON object:
{{"columns": [{{"key": "paper", "label": "Paper"}}, ...], "rows": [{{"paperTitle": "...", "cells": {{"paper": "...", "method": "...", ...}}}}]}}"""

SECTION_WRITE_PROMPT = """You are an academic review writer. Write a section for a literature review.

Review context:
Title: {review_title}
Section: {section_title}
Section type: {section_type}

Available papers with extracted knowledge:
{papers_context}

Writing guidelines:
- Synthesize information across papers, don't just list them one by one
- Compare and contrast different approaches where relevant
- Identify patterns, trends, and turning points in the research
- Use formal academic language
- Include approximate citation markers like [1], [2] to indicate which paper supports each claim
- Write in {language}

Write a complete draft of this section. Output ONLY the section content, no meta-commentary."""


# ===== Request/Response models =====

class ParsePaperRequest(BaseModel):
    title: str = Field(..., min_length=1)
    authors: str = Field(default="")
    abstract: str = Field(default="")

class ClusterRequest(BaseModel):
    papers: str = Field(..., min_length=1)  # JSON string of papers

class GapRequest(BaseModel):
    papers: str = Field(..., min_length=1)

class TableRequest(BaseModel):
    papers: str = Field(..., min_length=1)

class SectionWriteRequest(BaseModel):
    review_title: str = Field(..., min_length=1)
    section_title: str = Field(..., min_length=1)
    section_type: str = Field(default="body")
    papers_context: str = Field(default="")
    language: str = Field(default="Chinese")


# ===== Endpoints =====

@router.post("/review/parse-paper")
async def parse_paper(req: ParsePaperRequest):
    """Extract paper memory: contribution, method, dataset, etc."""
    prompt = PAPER_PARSE_PROMPT.format(
        title=req.title,
        authors=req.authors or "Unknown",
        abstract=req.abstract or "No abstract available.",
    )
    result = await reason_llm.chat(
        [{"role": "user", "content": prompt}], max_tokens=1024
    )
    return {"memory": result}


@router.post("/review/cluster")
async def cluster_papers(req: ClusterRequest):
    """Auto-cluster papers into topic groups."""
    prompt = TOPIC_CLUSTER_PROMPT.format(papers=req.papers)
    result = await reason_llm.chat(
        [{"role": "user", "content": prompt}], max_tokens=3072
    )
    return {"clusters": result}


@router.post("/review/gaps")
async def discover_gaps(req: GapRequest):
    """Discover research gaps from paper collection."""
    prompt = RESEARCH_GAP_PROMPT.format(papers=req.papers)
    result = await reason_llm.chat(
        [{"role": "user", "content": prompt}], max_tokens=3072
    )
    return {"gaps": result}


@router.post("/review/table")
async def generate_table(req: TableRequest):
    """Generate a comparison table from papers."""
    prompt = COMPARISON_TABLE_PROMPT.format(papers=req.papers)
    result = await reason_llm.chat(
        [{"role": "user", "content": prompt}], max_tokens=4096
    )
    return {"table": result}


@router.post("/review/write-section")
async def write_review_section(req: SectionWriteRequest):
    """Write a section draft for the literature review."""
    prompt = SECTION_WRITE_PROMPT.format(
        review_title=req.review_title,
        section_title=req.section_title,
        section_type=req.section_type,
        papers_context=req.papers_context or "No papers provided.",
        language=req.language,
    )
    result = await reason_llm.chat(
        [{"role": "user", "content": prompt}], max_tokens=4096
    )
    return {"content": result}


# ===== LangGraph Pipeline =====

class PipelineRequest(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    papers: str = Field(default="[]")  # JSON array of paper objects
    metadata: str = Field(default="{}")  # JSON: workspace_name, language, review_type, etc.


@router.post("/review/pipeline/stream")
async def run_pipeline_stream(req: PipelineRequest):
    """Run the full LangGraph review pipeline with SSE streaming.

    Yields progress events as SSE:
        step: current agent node
        progress: node label + index
        complete: final results (memories, clusters, gaps, drafts)
        error: error info if pipeline fails
    """
    import json
    from ..agents.graph import run_pipeline_stream as execute_pipeline

    papers = json.loads(req.papers) if isinstance(req.papers, str) else req.papers
    metadata = json.loads(req.metadata) if isinstance(req.metadata, str) else req.metadata

    state = {
        "workspace_id": req.workspace_id,
        "papers": papers,
        "paper_memories": [],
        "topic_clusters": [],
        "research_gaps": [],
        "section_drafts": [],
        "current_step": "init",
        "errors": [],
        "ckpt_id": None,
        "metadata": metadata,
    }

    return StreamingResponse(
        execute_pipeline(state),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
