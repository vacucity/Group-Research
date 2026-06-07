"""PromptRegistry — load, route, and version prompts."""

import os
import json
import re
import logging
from pathlib import Path
from typing import Optional

from .spec import PromptSpec
from .retry import RetryHandler

logger = logging.getLogger(__name__)

PROMPTS_ROOT = Path(__file__).parent


class PromptRegistry:
    """Manages prompt loading, versioning, and routing."""

    def __init__(self, root: Path | None = None):
        self.root = root or PROMPTS_ROOT
        self._cache: dict[str, PromptSpec] = {}

    def load(self, agent_name: str, version: str = "v1") -> PromptSpec:
        """Load a prompt from markdown file.

        Path: prompts/review/{agent_name}/{version}.md
        """
        cache_key = f"{agent_name}:{version}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Try review/* first
        filepath = self.root / "review" / agent_name / f"{version}.md"
        if not filepath.exists():
            # Try root level
            filepath = self.root / f"{agent_name}" / f"{version}.md"

        if not filepath.exists():
            logger.warning(f"Prompt file not found: {filepath}")
            return PromptSpec(
                name=agent_name,
                version=version,
                description="Auto-generated fallback",
                system_prompt=f"You are an AI assistant for {agent_name}.",
            )

        spec = self._parse_markdown(filepath, agent_name, version)
        self._cache[cache_key] = spec
        return spec

    def router(self, task: str, version: str = "v1") -> PromptSpec:
        """Route a task name to the correct prompt.

        Args:
            task: Task identifier (e.g., 'parse', 'cluster', 'gap', 'outline', 'write')
            version: Prompt version to use

        Returns:
            PromptSpec for the task
        """
        ROUTES = {
            "parse": "paper_understanding",
            "understand": "paper_understanding",
            "paper_understanding": "paper_understanding",
            "cluster": "topic_cluster",
            "topic_cluster": "topic_cluster",
            "clustering": "topic_cluster",
            "gap": "gap_discovery",
            "gaps": "gap_discovery",
            "gap_discovery": "gap_discovery",
            "outline": "review_outline",
            "review_outline": "review_outline",
            "write": "section_writer",
            "section": "section_writer",
            "section_writer": "section_writer",
            "write_section": "section_writer",
        }
        agent_name = ROUTES.get(task, task)
        return self.load(agent_name, version)

    def get_shared_prompts(self) -> dict[str, str]:
        """Load all shared prompt texts."""
        shared_dir = self.root / "shared"
        if not shared_dir.exists():
            return {}

        shared = {}
        for md_file in shared_dir.glob("*.md"):
            name = md_file.stem
            spec = self._parse_markdown(md_file, name, "v1")
            shared[name] = spec.system_prompt
        return shared

    def _parse_markdown(self, filepath: Path, name: str, version: str) -> PromptSpec:
        """Parse a prompt markdown file with YAML frontmatter.

        Format:
            ---
            name: ...
            version: ...
            description: ...
            output_schema: {...}
            ---
            System prompt body here...
        """
        import yaml  # Optional: PyYAML for frontmatter

        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        description = ""
        output_schema = {}
        system_prompt = content

        # Try YAML frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    frontmatter = yaml.safe_load(parts[1]) or {}
                except Exception:
                    # Fallback: basic key-value parsing
                    frontmatter = self._parse_simple_frontmatter(parts[1])

                description = frontmatter.get("description", "")
                output_schema = frontmatter.get("output_schema", {})
                system_prompt = parts[2].strip()

        return PromptSpec(
            name=name,
            version=version,
            description=description,
            system_prompt=system_prompt,
            output_schema=output_schema,
        )

    @staticmethod
    def _parse_simple_frontmatter(text: str) -> dict:
        """Simple frontmatter parser without PyYAML."""
        result: dict = {}
        for line in text.strip().split("\n"):
            m = re.match(r"(\w+):\s*(.+)", line)
            if m:
                result[m.group(1)] = m.group(2).strip()
        return result

    def list_agents(self) -> list[str]:
        """List all available agent prompt names."""
        review_dir = self.root / "review"
        if not review_dir.exists():
            return []
        return [d.name for d in review_dir.iterdir() if d.is_dir()]

    def list_versions(self, agent_name: str) -> list[str]:
        """List all versions for an agent."""
        agent_dir = self.root / "review" / agent_name
        if not agent_dir.exists():
            return []
        return [f.stem for f in agent_dir.glob("*.md")]

    async def run_prompt(
        self,
        task: str,
        llm_fn,
        context: dict[str, str],
        version: str = "v1",
    ) -> tuple[str | None, list[str]]:
        """Full pipeline: load prompt → format → call LLM → validate → retry.

        Args:
            task: Task name (routed to correct prompt)
            llm_fn: Async LLM call function (takes prompt str, returns output str)
            context: Format variables for prompt template
            version: Prompt version

        Returns:
            (validated_json_string, errors)
        """
        spec = self.router(task, version)
        formatted = spec.system_prompt.format(**context)
        spec.system_prompt = formatted  # Update in-place for this run

        retry = RetryHandler(max_retries=3)
        result, errors = await retry.run_with_retry(llm_fn, spec)
        return result, errors


# Global singleton
_registry: PromptRegistry | None = None


def get_registry() -> PromptRegistry:
    global _registry
    if _registry is None:
        _registry = PromptRegistry()
    return _registry
