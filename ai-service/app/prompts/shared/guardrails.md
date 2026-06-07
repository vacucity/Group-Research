---
name: guardrails
version: v1
description: Output guardrails — what to reject
---

# Prompt Guardrails

The following outputs will be REJECTED by the validator:

1. **Fake citations**: Citations to papers not in the provided literature
2. **Invented datasets**: Dataset names not mentioned in the source papers
3. **Invented metrics**: Metric values not found in the source papers
4. **Unsupported conclusions**: Claims with no evidence from the papers
5. **Empty outputs**: Completely empty or whitespace-only responses
6. **Non-JSON outputs**: Free-text instead of structured JSON (when JSON required)
7. **Out-of-scope responses**: Answers that ignore the task entirely

If any of these are detected, the output enters retry with the specific violation noted.
