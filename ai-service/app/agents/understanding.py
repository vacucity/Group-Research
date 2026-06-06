"""Agent 2: PaperUnderstandingAgent — Build PaperMemory for each paper."""

import json
import logging
from ..services.llm_client import reason_llm

logger = logging.getLogger(__name__)

UNDERSTAND_PROMPT = """You are an expert academic paper analyst. Deeply analyze the following paper and extract structured knowledge.

Paper:
Title: {title}
Authors: {authors}
Year: {year}
Abstract: {abstract}

Extract the following in JSON format. Be specific, cite evidence from the paper where possible. Return ONLY valid JSON.

Fields:
- contribution: Main contribution — what problem does this paper solve? (1-2 sentences)
- methodology: Key method/approach proposed (1-2 sentences, be specific about the technique)
- dataset: Datasets used for experiments (list names, or "None reported")
- metric: Key evaluation metrics and scores (e.g., "BLEU 28.5 on WMT14", or "None reported")
- baseline: What methods did they compare against? (list briefly)
- limitation: Limitations acknowledged by authors or obvious from the work (1-2 sentences)
- future_work: Suggested future work directions (1-2 sentences)
- keywords: 4-8 relevant keywords/phrases

Example:
{{"contribution": "Proposes the Transformer architecture that relies entirely on self-attention...", "methodology": "Self-attention mechanism with multi-head attention and positional encoding...", "dataset": "WMT 2014 English-German, WMT 2014 English-French", "metric": "BLEU 28.4 EN-DE, BLEU 41.8 EN-FR", "baseline": "RNN-based seq2seq with attention, ConvS2S", "limitation": "Quadratic complexity in sequence length; requires large training data", "future_work": "Applying self-attention to images, audio, and video; reducing computational complexity", "keywords": ["Transformer", "Self-Attention", "Machine Translation", "Neural Network", "Attention Mechanism"]}}"""


async def run_understanding(state: dict) -> dict:
    """Build PaperMemory for each paper.

    Updates state['paper_memories'].
    """
    papers = state.get("papers", [])
    if not papers:
        state["current_step"] = "understand_papers_done"
        return state

    state["current_step"] = "understand_papers"
    memories = []

    for paper in papers:
        try:
            prompt = UNDERSTAND_PROMPT.format(
                title=paper.get("title", "Unknown"),
                authors=paper.get("authors", "Unknown"),
                year=paper.get("year", "N/A"),
                abstract=paper.get("abstract", "No abstract available"),
            )
            result = await reason_llm.chat(
                [{"role": "user", "content": prompt}], max_tokens=1536
            )
            memory = _extract_json(result)
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
            # Add minimal memory
            memories.append({
                "paper_id": paper.get("id", ""),
                "paper_title": paper.get("title", ""),
                "contribution": "",
                "methodology": "",
                "dataset": "",
                "metric": "",
                "baseline": "",
                "limitation": "",
                "future_work": "",
                "keywords": [],
            })

    state["paper_memories"] = memories
    state["current_step"] = "understand_papers_done"
    return state


def _extract_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    m = __import__("re").search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    m = __import__("re").search(r"\{[\s\S]*\}", raw)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return {}
