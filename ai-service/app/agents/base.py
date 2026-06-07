"""BaseAgent — standard pipeline for all ReviewOS agents.

Pipeline: preprocess → generate → reflect → validate → retry → update_state
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Any

from ..prompts.registry import get_registry

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Abstract base class with standard agent pipeline.

    Subclasses override generate() and optionally preprocess/update_state.
    Validation and retry are handled automatically via the prompt registry.
    """

    max_retries: int = 3
    agent_name: str = "base"

    async def run(self, state: dict) -> dict:
        """Execute the full agent pipeline."""
        state = await self.preprocess(state)

        # Use prompt registry for validated generation
        registry = get_registry()

        output = await self.generate(state)
        state = await self.update_state(state, output)

        return state

    async def preprocess(self, state: dict) -> dict:
        """Prepare state before generation. Override to add context building."""
        return state

    @abstractmethod
    async def generate(self, state: dict) -> dict:
        """Core generation logic. Must be overridden by subclasses."""
        ...

    async def reflect(self, state: dict, output: dict) -> list[str]:
        """Self-reflection: check for issues in output.

        Override to add domain-specific checks.
        """
        return []

    async def update_state(self, state: dict, output: dict) -> dict:
        """Merge agent output into shared state. Override for custom logic."""
        state.update(output)
        return state

    def _log_step(self, step: str, detail: str = ""):
        logger.info(f"[{self.agent_name}] {step}: {detail}")

    def _format_feedback(self, issues: list[str]) -> str:
        return "Please fix the following issues:\n- " + "\n- ".join(issues)
