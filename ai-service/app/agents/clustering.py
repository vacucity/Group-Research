"""Agent 3: TopicClusteringAgent — Group papers via PromptRegistry."""

import json
import logging
from ..services.llm_client import reason_llm
from ..prompts.registry import get_registry

logger = logging.getLogger(__name__)


async def run_clustering(state: dict) -> dict:
    """Group paper memories into topic clusters using the prompt registry."""
    memories = state.get("paper_memories", [])
    if len(memories) < 3:
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
    registry = get_registry()

    async def call_llm(prompt: str) -> str:
        return await reason_llm.chat([{"role": "user", "content": prompt}], max_tokens=3072)

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

        result, errors = await registry.run_prompt(
            "cluster",
            call_llm,
            {"papers_json": json.dumps(papers_summary, indent=2)},
        )
        if result:
            state["topic_clusters"] = json.loads(result)
        else:
            logger.warning(f"Clustering validation failed: {errors}")
            state["topic_clusters"] = []
    except Exception as e:
        logger.error(f"Clustering failed: {e}")
        state.setdefault("errors", []).append({"agent": "TopicClustering", "error": str(e)})
        state["topic_clusters"] = []

    state["current_step"] = "cluster_topics_done"
    return state
