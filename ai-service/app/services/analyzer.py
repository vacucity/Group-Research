import re
from ..prompts.templates import ANALYSIS_PROMPT
from ..services.llm_client import reason_llm as llm


def _clean_cjk(text: str) -> str:
    """Collapse spaces between CJK characters (DeepSeek tokenizer artifact)."""
    return re.sub(r"([一-鿿])\s+([一-鿿])", r"\1\2", text)


async def analyze(text: str, paper_context: str | None = None, language: str = "Chinese") -> str:
    ctx = f"\nAdditional paper context:\n{paper_context}\n" if paper_context else ""
    prompt = ANALYSIS_PROMPT.format(text=text, paper_context=ctx, language=language)
    result = await llm.chat([{"role": "user", "content": prompt}], max_tokens=3072)
    return _clean_cjk(result)


async def analyze_stream(text: str, paper_context: str | None = None, language: str = "Chinese"):
    ctx = f"\nAdditional paper context:\n{paper_context}\n" if paper_context else ""
    prompt = ANALYSIS_PROMPT.format(text=text, paper_context=ctx, language=language)
    async for token in llm.chat_stream([{"role": "user", "content": prompt}], max_tokens=3072):
        yield token
