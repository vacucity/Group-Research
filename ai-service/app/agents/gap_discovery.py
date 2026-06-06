"""Agent 4: GapDiscoveryAgent — Identify research gaps from paper analysis."""

import json
import logging
from ..services.llm_client import reason_llm

logger = logging.getLogger(__name__)

GAP_PROMPT = """You are a research gap discovery system. Analyze the following paper collection to identify genuine, well-supported research gaps.

Topic clusters and their papers:
{clusters_json}

Paper memories (contribution, limitation, future_work):
{memories_json}

Identify 3-6 genuine research gaps. For each gap, consider:
- Saturation: Are certain directions over-explored?
- Missing datasets/tasks: What problems lack benchmark data?
- Contradictions: Do papers disagree on findings?
- Method gaps: Are there approaches not yet tried?
- Scale gaps: Do methods not scale to real-world problems?

For each gap, provide:
- title: Short, descriptive name
- description: 2-3 sentences describing the gap and its significance
- confidence: 0.1 to 1.0 (how confident you are this is a real gap)
- evidence_papers: Paper titles that provide evidence for this gap
- evidence_quotes: Specific quotes/paraphrases from those papers

Return ONLY a JSON array:
[
  {{
    "title": "Lack of Cross-Domain Evaluation",
    "description": "Most methods are evaluated on single-domain benchmarks...",
    "confidence": 0.85,
    "evidence_papers": ["Paper A", "Paper B"],
    "evidence_quotes": ["Paper A notes that...", "Paper B also identifies..."]
  }}
]"""


async def run_gap_discovery(state: dict) -> dict:
    """Discover research gaps from clusters and paper memories.

    Updates state['research_gaps'].
    """
    memories = state.get("paper_memories", [])
    clusters = state.get("topic_clusters", [])

    state["current_step"] = "discover_gaps"

    try:
        clusters_summary = [
            {
                "name": c.get("name"),
                "paper_titles": c.get("paper_titles", []),
            }
            for c in (clusters or [])
        ]
        memories_summary = [
            {
                "title": m.get("paper_title"),
                "contribution": m.get("contribution", "")[:300],
                "limitation": m.get("limitation", "")[:300],
                "future_work": m.get("future_work", "")[:300],
            }
            for m in memories
        ]

        prompt = GAP_PROMPT.format(
            clusters_json=json.dumps(clusters_summary, indent=2),
            memories_json=json.dumps(memories_summary, indent=2),
        )
        result = await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=3072
        )
        gaps = _extract_json_array(result)
        state["research_gaps"] = gaps
    except Exception as e:
        logger.error(f"Gap discovery failed: {e}")
        state.setdefault("errors", []).append({
            "agent": "GapDiscovery",
            "error": str(e),
        })
        state["research_gaps"] = []

    state["current_step"] = "discover_gaps_done"
    return state


def _extract_json_array(raw: str) -> list:
    try:
        result = json.loads(raw)
        if isinstance(result, list):
            return result
        return [result]
    except json.JSONDecodeError:
        pass
    m = __import__("re").search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if m:
        try:
            result = json.loads(m.group(1))
            if isinstance(result, list):
                return result
            return [result]
        except json.JSONDecodeError:
            pass
    m = __import__("re").search(r"\[[\s\S]*\]", raw)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return []
