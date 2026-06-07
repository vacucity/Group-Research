"""PromptSpec — structured prompt definition."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PromptSpec:
    """A versioned, structured prompt specification."""
    name: str
    version: str
    description: str
    system_prompt: str
    output_schema: dict[str, Any] = field(default_factory=dict)
    examples: list[dict[str, Any]] = field(default_factory=list)
    retry_prompt: str = ""

    @property
    def required_fields(self) -> list[str]:
        """Extract required field names from output_schema."""
        return self.output_schema.get("required", [])

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "system_prompt": self.system_prompt,
            "output_schema": self.output_schema,
            "examples": self.examples,
            "retry_prompt": self.retry_prompt,
        }
