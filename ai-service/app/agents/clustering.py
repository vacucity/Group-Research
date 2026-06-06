"""Agent 3: TopicClusteringAgent — Group papers into topic clusters."""

import json
import logging
from ..services.llm_client import reason_llm

logger = logging.getLogger(__name__)

CLUSTER_PROMPT = """You are a research topic analysis system. Given a list of papers with their extracted knowledge, group them into meaningful topic clusters.

Papers (title, contribution, method, keywords):
{papers_json}

Task:
1. Identify 3-6 distinct, meaningful topic clusters
2. Assign each paper to the most appropriate cluster
3. Provide a descriptive name and explanation for each cluster
4. Make sure clusters are mutually exclusive and collectively cover all papers

Return ONLY a JSON array:
[
  {{
    "name": "Transformer-based Methods",
    "description": "Methods that use self-attention mechanisms for sequence modeling",
    "paper_ids": ["id1", "id2"],
    "paper_titles": ["Paper A", "Paper B"],
    "color": "#6366f1"
  }}
]

Use colors from: ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"]"""


async def run_clustering(state: dict) -> dict:
    """Group paper memories into topic clusters.

    Updates state['topic_clusters'].
    """
    memories = state.get("paper_memories", [])
    if len(memories) < 3:
        logger.warning("Not enough paper memories to cluster")
        # Simple: one cluster per paper
        state["topic_clusters"] = [
            {
                "name": m.get("paper_title", f"Paper {i + 1}"),
                "description": m.get("contribution", ""),
                "paper_ids": [m.get("paper_id", "")],
                "paper_titles": [m.get("paper_title", "")],
                "color": "#6366f1",
            }
            for i, m in enumerate(memories)
        ]
        state["current_step"] = "cluster_topics_done"
        return state

    state["current_step"] = "cluster_topics"

    try:
        papers_summary = [
            {
                "id": m.get("paper_id"),
                "title": m.get("paper_title"),
                "contribution": m.get("contribution", "")[:200],
                "method": m.get("method", m.get("methodology", ""))[:200],
                "keywords": m.get("keywords", []),
            }
            for m in memories
        ]
        prompt = CLUSTER_PROMPT.format(papers_json=json.dumps(papers_summary, indent=2))
        result = await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=3072
        )
        clusters = _extract_json_array(result)
        state["topic_clusters"] = clusters
    except Exception as e:
        logger.error(f"Clustering failed: {e}")
        state.setdefault("errors", []).append({
            "agent": "TopicClustering",
            "error": str(e),
        })
        state["topic_clusters"] = []

    state["current_step"] = "cluster_topics_done"
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
