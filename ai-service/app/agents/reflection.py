"""Reflection Engine — post-generation self-critique.

Checks output for:
- Unsupported claims (no evidence from papers)
- Missing evidence (conclusions without backing)
- Citation mismatch (cited papers not in library)
- Internal contradictions
"""

import json
import logging
from ..services.llm_client import fast_llm

logger = logging.getLogger(__name__)

REFLECT_PROMPT = """You are a rigorous academic reviewer. Critique the following AI-generated text for a literature review.

Generated text:
{output}

Available papers (title, contribution):
{papers}

Check for these issues:
1. **Unsupported claims**: Claims stated as fact but not supported by any of the available papers.
2. **Citation mismatch**: Citation markers [N] that don't match any paper in the list.
3. **Hallucinated facts**: Specific numbers, metrics, or findings not present in the paper list.
4. **Missing evidence**: Strong conclusions drawn without citing specific papers.
5. **Internal contradiction**: Statements that contradict each other within the text.

If you find issues, output a JSON array of issues:
[
  {{"type": "unsupported_claim", "detail": "The claim '...' is not supported by any paper", "severity": "high"}},
  {{"type": "citation_mismatch", "detail": "Citation [5] does not exist", "severity": "high"}}
]

If no issues found, output: {{"issues": []}}

Return ONLY valid JSON. No meta-commentary."""


class ReflectionEngine:
    """Post-generation self-critique engine."""

    async def reflect(self, output: str, papers: list[dict]) -> list[dict]:
        """Check output against source papers for issues.

        Args:
            output: The generated text to check
            papers: Available paper metadata for verification

        Returns:
            List of issue dicts with type, detail, severity
        """
        if not output or not output.strip():
            return [{"type": "empty_output", "detail": "Output is empty", "severity": "critical"}]

        if not papers:
            return []  # No papers to verify against

        try:
            papers_summary = [
                {"title": p.get("title", p.get("paper_title", "")),
                 "contribution": p.get("contribution", "")[:150]}
                for p in papers[:20]  # Limit context
            ]

            prompt = REFLECT_PROMPT.format(
                output=output[:4000],
                papers=json.dumps(papers_summary, indent=2),
            )
            result = await fast_llm.chat(
                [{"role": "user", "content": prompt}], max_tokens=1024
            )

            parsed = self._parse_json(result)
            if isinstance(parsed, dict) and "issues" in parsed:
                return parsed["issues"]
            if isinstance(parsed, list):
                return parsed
            return []
        except Exception as e:
            logger.warning(f"Reflection failed: {e}")
            return []

    @staticmethod
    def _parse_json(raw: str) -> dict | list | None:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        import re
        m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                pass
        m = re.search(r"[\{\[][\s\S]*[\}\]]", raw)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                pass
        return None


# Singleton
_reflection_engine: ReflectionEngine | None = None


def get_reflection_engine() -> ReflectionEngine:
    global _reflection_engine
    if _reflection_engine is None:
        _reflection_engine = ReflectionEngine()
    return _reflection_engine
