from ..prompts.templates import TRANSLATION_PROMPT
from ..services.llm_client import fast_llm as llm


async def translate(text: str, target_lang: str = "Chinese") -> str:
    prompt = TRANSLATION_PROMPT.format(text=text, target_lang=target_lang)
    return await llm.chat([{"role": "user", "content": prompt}], max_tokens=1024)


async def translate_stream(text: str, target_lang: str = "Chinese"):
    prompt = TRANSLATION_PROMPT.format(text=text, target_lang=target_lang)
    async for token in llm.chat_stream([{"role": "user", "content": prompt}], max_tokens=1024):
        yield token
