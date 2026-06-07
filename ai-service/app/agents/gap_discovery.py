"""Agent 4: GapDiscoveryAgent — Identify gaps via PromptRegistry."""

import json
import logging
from ..services.llm_client import reason_llm
from ..prompts.registry import get_registry

logger = logging.getLogger(__name__)


async def run_gap_discovery(state: dict) -> dict:
    """Discover research gaps using the prompt registry."""
    memories = state.get("paper_memories", [])
    clusters = state.get("topic_clusters", [])

    state["current_step"] = "discover_gaps"
    registry = get_registry()

    async def call_llm(prompt: str) -> str:
        return await reason_llm.chat([{"role": "user", "content": prompt}], max_tokens=3072)

    try:
        clusters_summary = [
            {"name": c.get("name"), "paper_titles": c.get("paper_titles", [])}
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

        result, errors = await registry.run_prompt(
            "gap",
            call_llm,
            {
                "clusters_json": json.dumps(clusters_summary, indent=2),
                "memories_json": json.dumps(memories_summary, indent=2),
            },
        )
        if result:
            state["research_gaps"] = json.loads(result)
        else:
            logger.warning(f"Gap discovery validation failed: {errors}")
            state["research_gaps"] = []
    except Exception as e:
        logger.error(f"Gap discovery failed: {e}")
        state.setdefault("errors", []).append({"agent": "GapDiscovery", "error": str(e)})
        state["research_gaps"] = []

    state["current_step"] = "discover_gaps_done"
    return state
