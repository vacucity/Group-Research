"""OutputValidator — validate structured LLM outputs against schema."""

import json
import re
from typing import Any


class OutputValidator:
    """Validates LLM outputs against a JSON schema."""

    @staticmethod
    def validate(raw: str, spec) -> tuple[dict | list | None, list[str]]:
        """Validate raw LLM output against prompt spec.

        Returns (parsed_output, errors).
        If parsed_output is None, errors contains validation failures.
        """
        errors = []

        if not raw or not raw.strip():
            return None, ["Empty output"]

        # Step 1: Try to extract JSON
        parsed = OutputValidator._extract_json(raw)
        if parsed is None:
            return None, ["Output is not valid JSON"]

        # Step 2: Schema validation
        schema = spec.output_schema
        if not schema:
            return parsed, []

        schema_type = schema.get("type", "object")

        if schema_type == "array" and isinstance(parsed, list):
            item_schema = schema.get("items", {})
            for i, item in enumerate(parsed):
                item_errors = OutputValidator._validate_object(item, item_schema, f"[{i}]")
                errors.extend(item_errors)
        elif schema_type == "object" and isinstance(parsed, dict):
            errors.extend(OutputValidator._validate_object(parsed, schema, ""))
        elif schema_type == "array" and not isinstance(parsed, list):
            errors.append("Expected JSON array, got object")
        elif schema_type == "object" and not isinstance(parsed, dict):
            errors.append("Expected JSON object, got array")

        if errors:
            return None, errors

        return parsed, []

    @staticmethod
    def _validate_object(obj: dict, schema: dict, path: str) -> list[str]:
        """Validate a JSON object against schema properties."""
        errors = []

        # Required fields
        for field in schema.get("required", []):
            if field not in obj or obj[field] is None:
                errors.append(f"Missing required field: {path}.{field}")

        # Property types
        for field, prop_schema in schema.get("properties", {}).items():
            if field in obj and obj[field] is not None:
                prop_type = prop_schema.get("type", "string")
                if not OutputValidator._check_type(obj[field], prop_type):
                    errors.append(
                        f"Type mismatch for {path}.{field}: "
                        f"expected {prop_type}, got {type(obj[field]).__name__}"
                    )

                # Array item check
                if prop_type == "array" and "items" in prop_schema:
                    item_type = prop_schema["items"].get("type", "string")
                    for j, item in enumerate(obj[field]):
                        if not OutputValidator._check_type(item, item_type):
                            errors.append(
                                f"Type mismatch for {path}.{field}[{j}]: "
                                f"expected {item_type}"
                            )

        return errors

    @staticmethod
    def _check_type(value: Any, expected: str) -> bool:
        if expected == "string":
            return isinstance(value, str)
        elif expected == "number":
            return isinstance(value, (int, float))
        elif expected == "integer":
            return isinstance(value, int) and not isinstance(value, bool)
        elif expected == "boolean":
            return isinstance(value, bool)
        elif expected == "array":
            return isinstance(value, list)
        elif expected == "object":
            return isinstance(value, dict)
        return True

    @staticmethod
    def _extract_json(raw: str) -> dict | list | None:
        """Extract JSON from LLM output — tries multiple strategies."""
        # Direct parse
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            pass

        # Code block
        m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
        if m:
            try:
                return json.loads(m.group(1))
            except (json.JSONDecodeError, TypeError):
                pass

        # Braces match
        m = re.search(r"\{[\s\S]*\}", raw)
        if m:
            try:
                return json.loads(m.group(0))
            except (json.JSONDecodeError, TypeError):
                pass

        # Brackets match
        m = re.search(r"\[[\s\S]*\]", raw)
        if m:
            try:
                return json.loads(m.group(0))
            except (json.JSONDecodeError, TypeError):
                pass

        return None
