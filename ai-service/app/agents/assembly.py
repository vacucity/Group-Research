"""Agent 11: ReviewAssemblyAgent — Merge all sections into final review."""

import json
import logging
from ..services.llm_client import reason_llm

logger = logging.getLogger(__name__)

ASSEMBLY_PROMPT = """You are an academic editor assembling a final literature review paper from individual section drafts.

Review title: {title}

Section drafts (in order):
{sections}

Topic clusters:
{clusters}

Research gaps identified:
{gaps}

Method evolution:
{evolution}

Conflicts between papers:
{conflicts}

Task:
1. Merge all sections into a single, coherent paper
2. Add smooth transitions between sections
3. Ensure consistent terminology across sections
4. Add appropriate cross-references between sections
5. Include the method evolution and research gaps naturally
6. Note any conflicts between findings (do not hide disagreements)
7. Format with proper section headings

Output the complete, assembled review paper. Use Markdown formatting.

Rules:
- Preserve all citation markers [1], [2] from the original drafts
- Do not invent new findings
- Maintain academic tone throughout"""


async def run_assembly(state: dict) -> dict:
    """Merge all section drafts into a final review paper."""
    drafts = state.get("section_drafts", [])
    clusters = state.get("topic_clusters", [])
    gaps = state.get("research_gaps", [])
    evolution = state.get("evolution_graph", {})
    conflicts = state.get("conflict_reports", [])
    metadata = state.get("metadata", {})

    state["current_step"] = "assemble_review"

    if not drafts:
        state["final_review"] = ""
        state["current_step"] = "assemble_review_done"
        return state

    try:
        sections_text = "\n\n---\n\n".join([
            f"## {d.get('section_title', 'Section')}\n\n{d.get('content', '')}"
            for d in drafts
        ])

        prompt = ASSEMBLY_PROMPT.format(
            title=metadata.get("workspace_name", "Literature Review"),
            sections=sections_text[:8000],
            clusters=json.dumps([
                {"name": c.get("name"), "papers": c.get("paper_titles", [])}
                for c in clusters
            ], indent=2)[:2000],
            gaps=json.dumps([
                {"title": g.get("title"), "description": g.get("description", "")}
                for g in gaps
            ], indent=2)[:2000],
            evolution=json.dumps(evolution, indent=2)[:1500],
            conflicts=json.dumps(conflicts, indent=2)[:1500],
        )

        result = await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=8192
        )
        state["final_review"] = result
    except Exception as e:
        logger.error(f"Assembly failed: {e}")
        state.setdefault("errors", []).append({"agent": "ReviewAssembly", "error": str(e)})
        # Fallback: concatenate drafts
        state["final_review"] = "\n\n".join([
            f"# {d.get('section_title', 'Section')}\n\n{d.get('content', '')}"
            for d in drafts
        ])

    state["current_step"] = "assemble_review_done"
    return state
