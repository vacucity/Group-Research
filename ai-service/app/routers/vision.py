from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.llm_client import reason_llm as llm

router = APIRouter()

CHART_ANALYSIS_PROMPT = """You are an academic paper analysis assistant. Analyze the following content from a research paper, focusing on any charts, tables, figures, or data.

## Tasks:
1. Identify any charts, tables, or figures mentioned
2. Explain what each chart/table shows
3. Summarize the key data or findings presented
4. Explain the significance of these results in the context of the paper

{paper_context}

Content to analyze:
{text}

Respond in {language}. Be precise and scholarly."""


class ChartAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    paper_context: str | None = Field(default=None, max_length=5000)
    language: str = Field(default="English")


@router.post("/chart")
async def analyze_chart(req: ChartAnalysisRequest):
    """Analyze charts, tables, and figures from paper text content."""
    try:
        ctx = f"Additional paper context:\n{req.paper_context}\n" if req.paper_context else ""
        prompt = CHART_ANALYSIS_PROMPT.format(
            text=req.text, paper_context=ctx, language=req.language
        )
        result = await llm.chat([{"role": "user", "content": prompt}])
        return {"analysis": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chart/stream")
async def analyze_chart_stream(req: ChartAnalysisRequest):
    from sse_starlette.sse import EventSourceResponse

    async def event_generator():
        ctx = f"Additional paper context:\n{req.paper_context}\n" if req.paper_context else ""
        prompt = CHART_ANALYSIS_PROMPT.format(
            text=req.text, paper_context=ctx, language=req.language
        )
        async for token in llm.chat_stream([{"role": "user", "content": prompt}]):
            yield {"event": "token", "data": token}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())
