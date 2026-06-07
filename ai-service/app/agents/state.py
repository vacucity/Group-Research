"""ReviewState — shared state for all ReviewOS agents."""

from typing import TypedDict, Any


class PaperDict(TypedDict, total=False):
    id: str
    title: str
    authors: str
    abstract: str
    year: int | None


class PaperMemoryDict(TypedDict, total=False):
    paper_id: str
    paper_title: str
    contribution: str
    method: str
    dataset: str
    metric: str
    baseline: str
    limitation: str
    future_work: str
    keywords: list[str]


class TopicClusterDict(TypedDict, total=False):
    name: str
    description: str
    paper_ids: list[str]
    color: str


class ResearchGapDict(TypedDict, total=False):
    title: str
    description: str
    confidence: float
    evidence: list[dict[str, str]]


class ReviewState(TypedDict):
    """Shared state that flows through the LangGraph pipeline."""
    workspace_id: str
    papers: list[dict[str, Any]]
    paper_memories: list[dict[str, Any]]
    topic_clusters: list[dict[str, Any]]
    research_gaps: list[dict[str, Any]]
    section_drafts: list[dict[str, Any]]
    evolution_graph: dict[str, Any]       # Agent 6: MethodEvolutionAgent output
    conflict_reports: list[dict[str, Any]]  # Agent 10: ConflictDetectionAgent output
    final_review: str                      # Agent 11: ReviewAssemblyAgent output
    reflection_log: list[dict[str, Any]]   # Self-critique history
    current_step: str
    errors: list[dict[str, Any]]
    ckpt_id: str | None
    metadata: dict[str, Any]
