"""Agent 2: PaperUnderstandingAgent — Build PaperMemory via PromptRegistry."""

import json
import logging
from ..services.llm_client import reason_llm
from ..prompts.registry import get_registry

logger = logging.getLogger(__name__)


async def run_understanding(state: dict) -> dict:
    """Build PaperMemory for each paper using the prompt registry."""
    papers = state.get("papers", [])
    if not papers:
        state["current_step"] = "understand_papers_done"
        return state

    state["current_step"] = "understand_papers"
    registry = get_registry()
    memories = []

    async def call_llm(prompt: str) -> str:
        return await reason_llm.chat([{"role": "user", "content": prompt}], max_tokens=1536)

    for paper in papers:
        try:
            result, errors = await registry.run_prompt(
                "understand",
                call_llm,
                {
                    "title": paper.get("title", "Unknown"),
                    "authors": paper.get("authors", "Unknown"),
                    "year": str(paper.get("year", "N/A")),
                    "abstract": paper.get("abstract", "No abstract available"),
                },
            )
            if result:
                memory = json.loads(result)
            else:
                logger.warning(f"Understanding validation failed for {paper.get('title')}: {errors}")
                memory = {}
            memory["paper_id"] = paper.get("id", "")
            memory["paper_title"] = paper.get("title", "")
            memories.append(memory)
        except Exception as e:
            logger.error(f"Failed to understand paper {paper.get('title')}: {e}")
            state.setdefault("errors", []).append({
                "agent": "PaperUnderstanding",
                "paper_title": paper.get("title"),
                "error": str(e),
            })
            memories.append({
                "paper_id": paper.get("id", ""),
                "paper_title": paper.get("title", ""),
                "contribution": "", "methodology": "", "dataset": "",
                "metric": "", "baseline": "", "limitation": "", "future_work": "",
                "keywords": [],
            })

    state["paper_memories"] = memories
    state["current_step"] = "understand_papers_done"
    return state
