"""LangGraph StateGraph — orchestrates the 5-agent ReviewOS pipeline."""

import logging
from typing import AsyncGenerator

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import ReviewState
from .parsing import run_parsing
from .understanding import run_understanding
from .clustering import run_clustering
from .gap_discovery import run_gap_discovery
from .section_writing import run_section_writing
from .evolution import run_evolution
from .conflict import run_conflict_detection
from .assembly import run_assembly
from .checkpoint import FileCheckpointSaver

logger = logging.getLogger(__name__)


def build_review_graph() -> StateGraph:
    """Build and compile the ReviewOS agent graph.

    Topology (8 agents):
        parse → understand → cluster → evolution → gaps → write → conflict → assembly → END
    """
    workflow = StateGraph(ReviewState)

    # Add nodes — 8 agents total
    workflow.add_node("parse_papers", run_parsing)
    workflow.add_node("understand_papers", run_understanding)
    workflow.add_node("cluster_topics", run_clustering)
    workflow.add_node("discover_evolution", run_evolution)
    workflow.add_node("discover_gaps", run_gap_discovery)
    workflow.add_node("write_sections", run_section_writing)
    workflow.add_node("detect_conflicts", run_conflict_detection)
    workflow.add_node("assemble_review", run_assembly)

    # Wire edges — linear pipeline
    workflow.set_entry_point("parse_papers")
    workflow.add_edge("parse_papers", "understand_papers")
    workflow.add_edge("understand_papers", "cluster_topics")
    workflow.add_edge("cluster_topics", "discover_evolution")
    workflow.add_edge("discover_evolution", "discover_gaps")
    workflow.add_edge("discover_gaps", "write_sections")
    workflow.add_edge("write_sections", "detect_conflicts")
    workflow.add_edge("detect_conflicts", "assemble_review")
    workflow.add_edge("assemble_review", END)

    # Compile with memory saver for checkpointing
    memory = MemorySaver()
    compiled = workflow.compile(checkpointer=memory)

    return compiled


async def run_pipeline_stream(state: dict) -> AsyncGenerator[str, None]:
    """Run the full review pipeline and yield SSE progress events.

    Yields SSE-formatted strings:
        data: {"event": "step", "data": {"step": "parse_papers", "message": "..."}}
        data: {"event": "progress", "data": {...}}
        data: {"event": "result", "data": {...}}
        data: {"event": "complete", "data": {...}}
        data: {"event": "error", "data": {...}}
    """
    import json

    graph = build_review_graph()
    checkpoint_saver = FileCheckpointSaver()
    workspace_id = state.get("workspace_id", "unknown")

    config = {"configurable": {"thread_id": workspace_id}}

    step_names = [
        ("parse_papers", "Parsing paper metadata..."),
        ("understand_papers", "Extracting paper knowledge..."),
        ("cluster_topics", "Grouping into topic clusters..."),
        ("discover_evolution", "Tracing method evolution..."),
        ("discover_gaps", "Discovering research gaps..."),
        ("write_sections", "Writing section drafts..."),
        ("detect_conflicts", "Detecting paper conflicts..."),
        ("assemble_review", "Assembling final review..."),
    ]

    step_index = 0
    try:
        async for event in graph.astream(state, config, stream_mode="updates"):
            node_name = list(event.keys())[0] if event else ""
            node_data = event.get(node_name, {}) if event else {}

            # Send step event
            yield _sse("step", {
                "step": node_name,
                "current_step": node_data.get("current_step", node_name),
            })

            # Save checkpoint
            try:
                merged_state = {**state, **node_data}
                checkpoint_saver.save(workspace_id, merged_state, node_name)
            except Exception:
                pass

            # Update state with node output
            state.update(node_data)

            # Progress through step labels
            while step_index < len(step_names) and step_names[step_index][0] == node_name:
                yield _sse("progress", {
                    "step": node_name,
                    "label": step_names[step_index][1],
                    "index": step_index + 1,
                    "total": len(step_names),
                })
                step_index += 1

        # Pipeline complete — send results
        yield _sse("complete", {
            "workspace_id": workspace_id,
            "paper_count": len(state.get("paper_memories", [])),
            "cluster_count": len(state.get("topic_clusters", [])),
            "gap_count": len(state.get("research_gaps", [])),
            "draft_count": len(state.get("section_drafts", [])),
            "error_count": len(state.get("errors", [])),
            "paper_memories": state.get("paper_memories", []),
            "topic_clusters": state.get("topic_clusters", []),
            "research_gaps": state.get("research_gaps", []),
            "section_drafts": state.get("section_drafts", []),
            "errors": state.get("errors", []),
        })

    except Exception as e:
        logger.exception(f"Pipeline error: {e}")
        yield _sse("error", {
            "message": str(e),
            "current_step": state.get("current_step", "unknown"),
            "node_name": step_names[step_index][0] if step_index < len(step_names) else "unknown",
        })


def _sse(event: str, data: dict) -> str:
    """Format an SSE message."""
    import json
    payload = json.dumps({"event": event, "data": data}, ensure_ascii=False)
    return f"data: {payload}\n\n"
