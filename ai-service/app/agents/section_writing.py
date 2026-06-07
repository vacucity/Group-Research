"""Agent 5: SectionWritingAgent — Write drafts via PromptRegistry."""

import json
import logging
from ..services.llm_client import reason_llm
from ..prompts.registry import get_registry

logger = logging.getLogger(__name__)

DEFAULT_SECTIONS = [
    {"title": "Introduction", "type": "introduction"},
    {"title": "Related Work", "type": "related_work"},
    {"title": "Methods and Approaches", "type": "methodology"},
    {"title": "Comparative Analysis", "type": "comparison"},
    {"title": "Challenges and Future Directions", "type": "future_work"},
    {"title": "Conclusion", "type": "conclusion"},
]


async def run_section_writing(state: dict) -> dict:
    """Write draft for each section using the prompt registry."""
    state["current_step"] = "write_sections"
    registry = get_registry()

    metadata = state.get("metadata", {})
    review_topic = metadata.get("workspace_name", metadata.get("research_field", "Literature Review"))
    language = metadata.get("language", "Chinese")
    clusters = state.get("topic_clusters", [])
    memories = state.get("paper_memories", [])
    gaps = state.get("research_gaps", [])

    outline = metadata.get("outline") or [
        {"title": s["title"], "type": s["type"]} for s in DEFAULT_SECTIONS
    ]

    async def call_llm(prompt: str) -> str:
        return await reason_llm.chat([{"role": "user", "content": prompt}], max_tokens=4096)

    drafts = []

    for section in outline:
        section_title = section if isinstance(section, str) else section.get("title", str(section))

        try:
            result, errors = await registry.run_prompt(
                "write",
                call_llm,
                {
                    "review_topic": review_topic,
                    "section_title": section_title,
                    "language": language,
                    "clusters_json": json.dumps([
                        {"name": c.get("name"), "papers": c.get("paper_titles", [])}
                        for c in clusters
                    ], indent=2),
                    "memories_json": json.dumps([
                        {
                            "title": m.get("paper_title"),
                            "contribution": m.get("contribution", "")[:300],
                            "method": m.get("method", m.get("methodology", ""))[:200],
                            "limitation": m.get("limitation", "")[:200],
                        }
                        for m in memories
                    ], indent=2),
                    "gaps_json": json.dumps([
                        {"title": g.get("title"), "description": g.get("description", "")}
                        for g in gaps
                    ], indent=2),
                },
            )

            drafts.append({
                "section_title": section_title,
                "content": json.loads(result).get("content", result) if result else f"[Generation failed: {errors}]",
                "status": "draft" if result else "error",
            })
        except Exception as e:
            logger.error(f"Failed to write section '{section_title}': {e}")
            drafts.append({
                "section_title": section_title,
                "content": f"[Generation failed: {e}]",
                "status": "error",
            })

    state["section_drafts"] = drafts
    state["current_step"] = "write_sections_done"
    return state
