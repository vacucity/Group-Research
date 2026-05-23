from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.analyzer import analyze, analyze_stream

router = APIRouter()

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    paper_context: str | None = Field(default=None, max_length=50000)
    language: str = Field(default="Chinese")


@router.post("/analyze")
async def analyze_text(req: AnalyzeRequest):
    try:
        result = await analyze(req.text, req.paper_context, req.language)
        return {"analysis": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/stream")
async def analyze_stream_endpoint(req: AnalyzeRequest):
    from sse_starlette.sse import EventSourceResponse

    async def event_generator():
        async for token in analyze_stream(req.text, req.paper_context, req.language):
            yield {"event": "token", "data": token}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())
