"""Agent 6: MethodEvolutionAgent — Discover method evolution timeline."""

import json
import logging
from ..services.llm_client import reason_llm

logger = logging.getLogger(__name__)

EVOLUTION_PROMPT = """You are a research methodology historian. Analyze the following papers and trace how methods have evolved over time.

Papers (title, year, contribution, method):
{papers_json}

Task:
1. Extract the key methods/approaches from each paper
2. Order them chronologically
3. Identify parent-child relationships (which earlier methods influenced later ones)
4. Describe the reason for each evolution step

Return ONLY a JSON object:
{{
  "nodes": [
    {{"id": "method_name", "year": 2017, "paper": "Paper Title", "description": "Brief method description"}}
  ],
  "edges": [
    {{"source": "parent_method", "target": "child_method", "reason": "Why this evolution happened"}}
  ],
  "timeline": "Brief narrative of the overall evolution (2-3 sentences)"
}}

Rules:
- Only use methods actually described in the papers
- Each node should represent a distinct methodological advance
- Edges should represent genuine influence/improvement relationships"""


async def run_evolution(state: dict) -> dict:
    """Build method evolution graph from paper memories."""
    memories = state.get("paper_memories", [])
    state["current_step"] = "discover_evolution"

    if len(memories) < 2:
        state["evolution_graph"] = {"nodes": [], "edges": [], "timeline": ""}
        state["current_step"] = "discover_evolution_done"
        return state

    try:
        papers_summary = [
            {
                "title": m.get("paper_title", ""),
                "year": m.get("year", "N/A"),
                "contribution": m.get("contribution", "")[:200],
                "method": m.get("method", m.get("methodology", ""))[:200],
            }
            for m in memories
        ]
        # Sort by year
        papers_summary.sort(key=lambda x: str(x.get("year", "9999")))

        prompt = EVOLUTION_PROMPT.format(papers_json=json.dumps(papers_summary, indent=2))
        result = await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=2048
        )
        graph = _extract_json(result)
        state["evolution_graph"] = graph if graph else {"nodes": [], "edges": [], "timeline": ""}
    except Exception as e:
        logger.error(f"Evolution discovery failed: {e}")
        state.setdefault("errors", []).append({"agent": "MethodEvolution", "error": str(e)})
        state["evolution_graph"] = {"nodes": [], "edges": [], "timeline": ""}

    state["current_step"] = "discover_evolution_done"
    return state


def _extract_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    import re
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if m:
        try: return json.loads(m.group(1))
        except json.JSONDecodeError: pass
    m = re.search(r"\{[\s\S]*\}", raw)
    if m:
        try: return json.loads(m.group(0))
        except json.JSONDecodeError: pass
    return {}
