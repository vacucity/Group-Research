"""Agent 1: PaperParsingAgent — Extract structured metadata from raw papers."""

import json
import logging
from ..services.llm_client import fast_llm

logger = logging.getLogger(__name__)

PARSE_PROMPT = """You are an expert academic paper parser. Extract structured metadata from the following paper information.

Title: {title}
Authors: {authors}
Abstract: {abstract}

Extract the following fields in JSON format. Be precise and concise. Return ONLY valid JSON, no meta-commentary.

Required fields:
- title: Cleaned paper title
- authors: Author list as a string
- year: Publication year (integer, or null if unknown)
- abstract: Cleaned abstract (max 500 chars)
- full_text_sections: Estimate how the paper is structured (e.g., ["Introduction", "Related Work", "Method", "Experiments", "Conclusion"])

Example output:
{{"title": "Attention Is All You Need", "authors": "Vaswani et al.", "year": 2017, "abstract": "We propose a new simple network architecture...", "full_text_sections": ["Introduction", "Background", "Model Architecture", "Training", "Results", "Conclusion"]}}"""


async def run_parsing(state: dict) -> dict:
    """Run paper parsing for all unparsed papers in the state.

    Updates state['papers'] with parsed metadata.
    """
    papers = state.get("papers", [])
    if not papers:
        logger.warning("No papers to parse")
        state["current_step"] = "parse_papers_done"
        return state

    state["current_step"] = "parse_papers"

    for i, paper in enumerate(papers):
        # Skip already parsed
        if paper.get("_parsed"):
            continue

        try:
            prompt = PARSE_PROMPT.format(
                title=paper.get("title", "Unknown"),
                authors=paper.get("authors", "Unknown"),
                abstract=paper.get("abstract", "No abstract available"),
            )
            result = await fast_llm.chat(
                [{"role": "user", "content": prompt}], max_tokens=1024
            )
            parsed = _extract_json(result)
            paper["title"] = parsed.get("title", paper.get("title"))
            paper["authors"] = parsed.get("authors", paper.get("authors"))
            paper["year"] = parsed.get("year")
            paper["abstract"] = parsed.get("abstract", paper.get("abstract"))
            paper["_parsed"] = True
            paper["_sections"] = parsed.get("full_text_sections", [])
        except Exception as e:
            logger.error(f"Failed to parse paper {paper.get('title')}: {e}")
            state.setdefault("errors", []).append({
                "agent": "PaperParsing",
                "paper_title": paper.get("title"),
                "error": str(e),
            })
            paper["_parsed"] = True  # Mark as parsed to avoid retry loop
            paper["_parse_error"] = str(e)

    state["current_step"] = "parse_papers_done"
    return state


def _extract_json(raw: str) -> dict:
    """Extract a JSON object from LLM output."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # Try code block
    m = __import__("re").search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    # Try brace match
    m = __import__("re").search(r"\{[\s\S]*\}", raw)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return {}
