import re
from ..prompts.templates import QA_PROMPT
from ..services.llm_client import reason_llm as llm


def _clean_cjk(text: str) -> str:
    return re.sub(r"([一-鿿])\s+([一-鿿])", r"\1\2", text)


async def answer_question(question: str, context: str, title_abstract: str = "") -> str:
    prompt = QA_PROMPT.format(
        question=question,
        content=context or "No full text available.",
        title_abstract=title_abstract or "No abstract available.",
    )
    result = await llm.chat([{"role": "user", "content": prompt}], max_tokens=4096)
    return _clean_cjk(result)


async def answer_question_stream(question: str, context: str, title_abstract: str = ""):
    prompt = QA_PROMPT.format(
        question=question,
        content=context or "No full text available.",
        title_abstract=title_abstract or "No abstract available.",
    )
    async for token in llm.chat_stream([{"role": "user", "content": prompt}], max_tokens=4096):
        yield token
