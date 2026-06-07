"""Agent 10: ConflictDetectionAgent — Detect contradictions between papers."""

import json
import logging
from ..services.llm_client import reason_llm

logger = logging.getLogger(__name__)

CONFLICT_PROMPT = """You are a research contradiction detector. Analyze paper findings and identify conflicts or disagreements between papers.

Papers with their findings:
{papers_json}

Identify contradictions such as:
1. **Metric conflict**: Paper A claims Method X is best, Paper B claims Method Y is best on the same task
2. **Finding conflict**: Papers report opposite conclusions about the same phenomenon
3. **Method disagreement**: Papers advocate for incompatible approaches
4. **Dataset bias**: Papers use different datasets leading to incomparable results

For each conflict found, output:
{{
  "conflicts": [
    {{
      "title": "Short conflict title",
      "description": "What the disagreement is about (2-3 sentences)",
      "paper_a": "First paper title",
      "paper_b": "Second paper title",
      "claim_a": "What Paper A claims",
      "claim_b": "What Paper B claims",
      "resolution": "Possible resolution or explanation (e.g., different datasets, different metrics, different experimental settings)",
      "severity": "minor|moderate|major"
    }}
  ]
}}

If no conflicts found, output: {{"conflicts": []}}
Return ONLY valid JSON. No meta-commentary."""


async def run_conflict_detection(state: dict) -> dict:
    """Detect contradictions between paper findings."""
    memories = state.get("paper_memories", [])
    sections = state.get("section_drafts", [])
    state["current_step"] = "detect_conflicts"

    if len(memories) < 2:
        state["conflict_reports"] = []
        state["current_step"] = "detect_conflicts_done"
        return state

    try:
        papers_summary = [
            {
                "title": m.get("paper_title", ""),
                "method": m.get("method", m.get("methodology", ""))[:200],
                "metric": m.get("metric", "")[:200],
                "contribution": m.get("contribution", "")[:200],
                "limitation": m.get("limitation", "")[:200],
            }
            for m in memories
        ]

        prompt = CONFLICT_PROMPT.format(papers_json=json.dumps(papers_summary, indent=2))
        result = await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=2048
        )
        parsed = _extract_json(result)
        state["conflict_reports"] = parsed.get("conflicts", []) if parsed else []
    except Exception as e:
        logger.error(f"Conflict detection failed: {e}")
        state.setdefault("errors", []).append({"agent": "ConflictDetection", "error": str(e)})
        state["conflict_reports"] = []

    state["current_step"] = "detect_conflicts_done"
    return state


def _extract_json(raw: str) -> dict:
    try: return json.loads(raw)
    except json.JSONDecodeError: pass
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
