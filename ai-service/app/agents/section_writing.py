"""Agent 5: SectionWritingAgent — Write draft sections for the literature review."""

import json
import logging
from ..services.llm_client import reason_llm

logger = logging.getLogger(__name__)

WRITE_SECTION_PROMPT = """You are an expert academic review writer. Write a draft section for a literature review.

Review topic: {review_topic}
Section: {section_title}

Available topic clusters and their papers:
{clusters_json}

Paper knowledge summaries:
{memories_json}

Research gaps identified:
{gaps_json}

Writing guidelines:
- Synthesize information across papers — do NOT just list papers one by one
- Compare and contrast different approaches
- Highlight evolution of methods ("Early work did X, then Y improved, now Z is standard")
- Point out open problems and gaps from the research gaps list
- Use formal academic language in {language}
- Place approximate citation markers like [1], [2] to indicate which paper supports each claim
- Structure: topic overview → method categories → comparison → gaps → summary

Write a complete, well-structured draft of this section. Output ONLY the section content, no meta-commentary."""


DEFAULT_SECTIONS = [
    {"title": "Introduction", "type": "introduction"},
    {"title": "Related Work", "type": "related_work"},
    {"title": "Methods and Approaches", "type": "methodology"},
    {"title": "Comparative Analysis", "type": "comparison"},
    {"title": "Challenges and Future Directions", "type": "future_work"},
    {"title": "Conclusion", "type": "conclusion"},
]


async def run_section_writing(state: dict) -> dict:
    """Write draft for each section of the review outline.

    Uses topic clusters + gaps to generate section drafts.
    Updates state['section_drafts'].
    """
    state["current_step"] = "write_sections"

    metadata = state.get("metadata", {})
    review_topic = metadata.get("workspace_name", metadata.get("research_field", "Literature Review"))
    language = metadata.get("language", "Chinese")
    clusters = state.get("topic_clusters", [])
    memories = state.get("paper_memories", [])
    gaps = state.get("research_gaps", [])

    # Determine sections: from outline in state or defaults
    outline = metadata.get("outline") or [
        {"title": s["title"], "type": s["type"]} for s in DEFAULT_SECTIONS
    ]

    drafts = []

    for section in outline:
        section_title = section if isinstance(section, str) else section.get("title", str(section))

        try:
            prompt = WRITE_SECTION_PROMPT.format(
                review_topic=review_topic,
                section_title=section_title,
                clusters_json=json.dumps([
                    {"name": c.get("name"), "papers": c.get("paper_titles", [])}
                    for c in clusters
                ], indent=2),
                memories_json=json.dumps([
                    {
                        "title": m.get("paper_title"),
                        "contribution": m.get("contribution", "")[:300],
                        "method": m.get("method", m.get("methodology", ""))[:200],
                        "limitation": m.get("limitation", "")[:200],
                    }
                    for m in memories
                ], indent=2),
                gaps_json=json.dumps([
                    {"title": g.get("title"), "description": g.get("description", "")}
                    for g in gaps
                ], indent=2),
                language=language,
            )
            result = await reason_llm.chat(
                [{"role": "user", "content": prompt}], max_tokens=4096
            )

            drafts.append({
                "section_title": section_title,
                "content": result,
                "status": "draft",
            })
        except Exception as e:
            logger.error(f"Failed to write section '{section_title}': {e}")
            state.setdefault("errors", []).append({
                "agent": "SectionWriting",
                "section": section_title,
                "error": str(e),
            })
            drafts.append({
                "section_title": section_title,
                "content": f"[Generation failed: {e}]",
                "status": "error",
            })

    state["section_drafts"] = drafts
    state["current_step"] = "write_sections_done"
    return state
