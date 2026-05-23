import re
from typing import AsyncGenerator
import httpx
from ..config import settings


class LLMClient:
    """Dual-model client: fast model for translation, reasoning model for analysis/Q&A."""

    def __init__(self, model: str, base_url: str, api_key: str):
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(300.0))
        return self._client

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.api_key and self.api_key != "ollama":
            h["Authorization"] = f"Bearer {self.api_key}"
        return h

    async def chat(self, messages: list[dict], temperature: float = 0.3, max_tokens: int = 2048) -> str:
        client = await self._get_client()
        response = await client.post(
            f"{self.base_url}/chat/completions",
            headers=self._headers(),
            json={
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return self._clean_think(content)

    async def chat_stream(
        self, messages: list[dict], temperature: float = 0.3, max_tokens: int = 2048
    ) -> AsyncGenerator[str, None]:
        client = await self._get_client()
        async with client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            headers=self._headers(),
            json={
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            },
        ) as response:
            response.raise_for_status()
            buffer = ""
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        if buffer:
                            yield self._filter_think_buffer(buffer)
                            buffer = ""
                        break
                    import json
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            buffer += content
                            # Flush safe parts (outside think tags)
                            clean, buffer = self._stream_filter(buffer)
                            if clean:
                                yield clean
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
            if buffer:
                yield self._filter_think_buffer(buffer)

    def _stream_filter(self, text: str) -> tuple[str, str]:
        """Filter think tags from streaming text. Returns (clean_output, remaining_buffer)."""
        # If we're inside a think block, buffer until we see </think>
        if "<think>" in text or "<think" in text:
            # Find and remove think blocks
            result = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
            # Check if we have an unclosed think tag
            if "<think>" in result and "</think>" not in result.split("<think>", 1)[1] if "<think>" in result else False:
                # Unclosed think tag - keep everything before it
                parts = result.split("<think>", 1)
                return parts[0], ""
            return result, ""
        else:
            # No think tags - check for trailing "<" that might start a tag
            last_lt = text.rfind("<")
            if last_lt != -1 and ">" not in text[last_lt:]:
                # Possible start of think tag
                return text[:last_lt], text[last_lt:]
            return text, ""

    def _filter_think_buffer(self, text: str) -> str:
        """Final filter for any remaining think tags in buffer."""
        return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).replace("<think>", "").strip()

    @staticmethod
    def _clean_think(text: str) -> str:
        """Remove <think>...</think> tags from deepseek-r1 output."""
        return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None


# Two client instances
fast_llm = LLMClient(
    model=settings.fast_model,
    base_url=settings.fast_base_url,
    api_key=settings.fast_api_key,
)

reason_llm = LLMClient(
    model=settings.reason_model,
    base_url=settings.reason_base_url,
    api_key=settings.reason_api_key,
)
