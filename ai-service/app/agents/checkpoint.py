"""Checkpoint persistence — file-based using LangGraph MemorySaver."""

import json
import os
import logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

CHECKPOINTS_DIR = Path(__file__).parent.parent.parent / "checkpoints"


class FileCheckpointSaver:
    """Simple checkpoint saver backed by JSON files + MemorySaver."""

    def __init__(self):
        CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)

    def save(self, workspace_id: str, state: dict, node_name: str) -> str:
        """Save a checkpoint snapshot to disk. Returns checkpoint filename."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        filename = f"{workspace_id}_{node_name}_{timestamp}.json"

        # Strip non-serializable fields for checkpoint
        snapshot = {
            "workspace_id": state.get("workspace_id"),
            "current_step": node_name,
            "paper_count": len(state.get("papers", [])),
            "memory_count": len(state.get("paper_memories", [])),
            "cluster_count": len(state.get("topic_clusters", [])),
            "gap_count": len(state.get("research_gaps", [])),
            "draft_count": len(state.get("section_drafts", [])),
            "error_count": len(state.get("errors", [])),
            "timestamp": timestamp,
            "node_name": node_name,
            # Serialize core state for recovery
            "paper_memories": state.get("paper_memories", []),
            "topic_clusters": state.get("topic_clusters", []),
            "research_gaps": state.get("research_gaps", []),
            "section_drafts": state.get("section_drafts", []),
            "errors": state.get("errors", []),
        }

        filepath = CHECKPOINTS_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)

        logger.info(f"Checkpoint saved: {filename}")
        return filename

    def load(self, workspace_id: str) -> dict | None:
        """Load the most recent checkpoint for a workspace."""
        files = sorted(
            CHECKPOINTS_DIR.glob(f"{workspace_id}_*.json"),
            key=os.path.getmtime,
            reverse=True,
        )
        if not files:
            return None

        with open(files[0], "r", encoding="utf-8") as f:
            snapshot = json.load(f)
        logger.info(f"Checkpoint loaded: {files[0].name}")
        return snapshot

    def list_checkpoints(self, workspace_id: str) -> list[str]:
        """List all checkpoint filenames for a workspace."""
        files = sorted(CHECKPOINTS_DIR.glob(f"{workspace_id}_*.json"))
        return [f.name for f in files]
