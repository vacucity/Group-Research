"""RetryHandler — automatic retry with validation feedback."""

import logging
from typing import Callable, Awaitable, Any
from .validator import OutputValidator
from .spec import PromptSpec

logger = logging.getLogger(__name__)


class RetryHandler:
    """Handles automatic retry with validation feedback."""

    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
        self.stats: dict[str, dict] = {}  # prompt_name -> {success, retry, fail}

    async def run_with_retry(
        self,
        llm_fn: Callable[[str], Awaitable[str]],
        spec: PromptSpec,
        context: dict[str, str] | None = None,
    ) -> tuple[str | None, list[str]]:
        """Run LLM call with retry on validation failure.

        Args:
            llm_fn: Async function that takes a prompt string and returns LLM output
            spec: PromptSpec with output_schema for validation
            context: Extra context for retry error messages

        Returns:
            (validated_json_string, errors)
        """
        prompt_name = spec.name
        if prompt_name not in self.stats:
            self.stats[prompt_name] = {"success": 0, "retry": 0, "fail": 0}

        messages = [{"role": "user", "content": spec.system_prompt}]
        if spec.examples:
            for ex in spec.examples:
                messages.append({"role": "user", "content": f"Example input: {json.dumps(ex.get('input', {}))}"})
                messages.append({"role": "assistant", "content": f"Example output: {json.dumps(ex.get('output', {}))}"})

        last_errors: list[str] = []

        for attempt in range(self.max_retries + 1):
            try:
                # Build the full prompt with retry feedback
                prompt = messages[-1]["content"] if messages else spec.system_prompt

                if attempt > 0 and last_errors:
                    # Inject retry feedback
                    error_feedback = spec.retry_prompt or (
                        f"\n\nYour previous output had validation errors. Please fix them:\n"
                        + "\n".join(f"- {e}" for e in last_errors)
                        + f"\n\nPlease output ONLY valid JSON matching the required schema. Retry attempt {attempt}/{self.max_retries}."
                    )
                    messages.append({"role": "user", "content": error_feedback})

                # Call LLM
                raw = await llm_fn(messages[-1]["content"])

                # Validate
                parsed, errors = OutputValidator.validate(raw, spec)
                if parsed is not None and not errors:
                    self.stats[prompt_name]["success"] += 1
                    return json.dumps(parsed, ensure_ascii=False), []

                last_errors = errors
                if attempt < self.max_retries:
                    logger.warning(
                        f"Retry {attempt + 1}/{self.max_retries} for {prompt_name}: {errors}"
                    )
                    self.stats[prompt_name]["retry"] += 1

            except Exception as e:
                last_errors = [str(e)]
                if attempt < self.max_retries:
                    logger.warning(f"Retry {attempt + 1}/{self.max_retries} for {prompt_name}: {e}")
                    self.stats[prompt_name]["retry"] += 1

        self.stats[prompt_name]["fail"] += 1
        return None, last_errors

    def get_stats(self) -> dict:
        return dict(self.stats)


import json  # noqa: E402 (needed at top-level for json.dumps usage)
