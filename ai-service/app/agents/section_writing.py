"""Agent 5: SectionWritingAgent — with internal sub-node pipeline.

Sub-nodes: TopicSummary → MethodComparison → Strength → Limitation → Transition → CitationCheck
"""

import json
import logging
from ..services.llm_client import reason_llm
from ..prompts.registry import get_registry
from .reflection import get_reflection_engine

logger = logging.getLogger(__name__)

DEFAULT_SECTIONS = [
    {"title": "Introduction", "type": "introduction"},
    {"title": "Related Work", "type": "related_work"},
    {"title": "Methods and Approaches", "type": "methodology"},
    {"title": "Comparative Analysis", "type": "comparison"},
    {"title": "Challenges and Future Directions", "type": "future_work"},
    {"title": "Conclusion", "type": "conclusion"},
]

# Sub-node prompts
TOPIC_SUMMARY_PROMPT = """Summarize the key research topics for section '{section_title}' based on these clusters:
{clusters_text}

Output a concise 2-3 sentence topic overview."""

METHOD_COMPARISON_PROMPT = """Compare methods across these papers for section '{section_title}':
{memories_text}

Output a comparison highlighting similarities and differences between approaches."""

STRENGTH_PROMPT = """Identify the key strengths and advantages of the methods described:
{memories_text}

Output 3-5 strengths with specific paper references."""

LIMITATION_PROMPT = """Identify the key limitations and weaknesses:
{memories_text}

Output 3-5 limitations with specific paper references."""

TRANSITION_PROMPT = """Write a smooth transition from the previous section content to the next section.
Previous section: {prev_section}
Next section: {section_title}

Output 1-2 transition sentences."""


async def run_section_writing(state: dict) -> dict:
    """Write draft for each section using the prompt registry with sub-node enhancement."""
    state["current_step"] = "write_sections"
    registry = get_registry()

    metadata = state.get("metadata", {})
    review_topic = metadata.get("workspace_name", metadata.get("research_field", "Literature Review"))
    language = metadata.get("language", "Chinese")
    clusters = state.get("topic_clusters", [])
    memories = state.get("paper_memories", [])
    gaps = state.get("research_gaps", [])
    evolution = state.get("evolution_graph", {})

    outline = metadata.get("outline") or [
        {"title": s["title"], "type": s["type"]} for s in DEFAULT_SECTIONS
    ]

    async def call_llm(prompt: str) -> str:
        return await reason_llm.chat([{"role": "user", "content": prompt}], max_tokens=4096)

    drafts = []
    prev_title = ""
    reflection_engine = get_reflection_engine()
    reflection_log = state.get("reflection_log", [])

    for i, section in enumerate(outline):
        section_title = section if isinstance(section, str) else section.get("title", str(section))

        try:
            # --- Main generation via prompt registry ---
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
                        {"title": m.get("paper_title"), "contribution": m.get("contribution", "")[:300],
                         "method": m.get("method", m.get("methodology", ""))[:200],
                         "limitation": m.get("limitation", "")[:200]}
                        for m in memories
                    ], indent=2),
                    "gaps_json": json.dumps([
                        {"title": g.get("title"), "description": g.get("description", "")}
                        for g in gaps
                    ], indent=2),
                },
            )

            main_content = json.loads(result).get("content", result) if result else ""

            # --- Sub-node: Topic Summary ---
            clusters_text = "\n".join([
                f"- {c.get('name')}: {', '.join(c.get('paper_titles', []))}"
                for c in clusters
            ])
            topic_summary = await fast_llm_chat(
                TOPIC_SUMMARY_PROMPT.format(section_title=section_title, clusters_text=clusters_text)
            ) if clusters else ""

            # --- Sub-node: Method Comparison ---
            memories_text = "\n".join([
                f"- {m.get('paper_title')}: {m.get('method', m.get('methodology', ''))[:200]}"
                for m in memories[:10]
            ])
            method_comparison = await fast_llm_chat(
                METHOD_COMPARISON_PROMPT.format(section_title=section_title, memories_text=memories_text)
            ) if len(memories) >= 2 else ""

            # --- Sub-node: Strengths ---
            strengths = await fast_llm_chat(
                STRENGTH_PROMPT.format(memories_text=memories_text)
            ) if memories else ""

            # --- Sub-node: Limitations ---
            limitations = await fast_llm_chat(
                LIMITATION_PROMPT.format(memories_text=memories_text)
            ) if memories else ""

            # --- Sub-node: Transition ---
            transition = ""
            if prev_title and i > 0:
                transition = await fast_llm_chat(
                    TRANSITION_PROMPT.format(prev_section=prev_title, section_title=section_title)
                )

            # --- Sub-node: Citation Check ---
            cited_titles = [m.get("paper_title", "").lower() for m in memories]
            citation_issues = _check_citations(main_content, cited_titles)

            # --- Assemble enriched content ---
            enriched = main_content
            if topic_summary and topic_summary not in main_content:
                enriched = f"{topic_summary}\n\n{enriched}"
            if method_comparison and len(memories) >= 3:
                enriched += f"\n\n### Method Comparison\n\n{method_comparison}"
            if strengths:
                enriched += f"\n\n### Strengths\n\n{strengths}"
            if limitations:
                enriched += f"\n\n### Limitations\n\n{limitations}"

            # --- Reflection ---
            reflect_issues = await reflection_engine.reflect(enriched, memories)
            if reflect_issues:
                reflection_log.append({
                    "section": section_title,
                    "issues": reflect_issues,
                })
                logger.info(f"Reflection found {len(reflect_issues)} issues in '{section_title}'")

            drafts.append({
                "section_title": section_title,
                "content": enriched,
                "topic_summary": topic_summary,
                "method_comparison": method_comparison,
                "strengths": strengths,
                "limitations": limitations,
                "transition": transition,
                "citation_issues": citation_issues,
                "reflection_issues": len(reflect_issues),
                "status": "draft",
            })

            prev_title = section_title

        except Exception as e:
            logger.error(f"Failed to write section '{section_title}': {e}")
            state.setdefault("errors", []).append({
                "agent": "SectionWriting", "section": section_title, "error": str(e),
            })
            drafts.append({
                "section_title": section_title,
                "content": f"[Generation failed: {e}]",
                "status": "error",
            })

    state["section_drafts"] = drafts
    state["reflection_log"] = reflection_log
    state["current_step"] = "write_sections_done"
    return state


async def fast_llm_chat(prompt: str) -> str:
    """Quick sub-node LLM call using fast model."""
    try:
        return await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=1024
        )
    except Exception:
        return ""


def _check_citations(content: str, available_titles: list[str]) -> list[str]:
    """Check that citation markers reference real papers."""
    import re
    issues = []
    markers = re.findall(r"\[(\d+(?:,\d+)*)\]", content)
    # Simple check: ensure we have enough papers for the citation numbers
    if markers:
        for marker_group in markers:
            for num in marker_group.split(","):
                try:
                    idx = int(num.strip()) - 1
                    if idx < 0 or idx >= len(available_titles):
                        issues.append(f"Citation [{num}] out of range (available: 1-{len(available_titles)})")
                except ValueError:
                    pass
    return issues
