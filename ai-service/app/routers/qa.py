from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.paper_qa import answer_question, answer_question_stream

router = APIRouter()

class QARequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    context: str = Field(default="", max_length=80000)
    title_abstract: str = Field(default="", max_length=5000)


@router.post("/qa")
async def qa_endpoint(req: QARequest):
    try:
        result = await answer_question(req.question, req.context, req.title_abstract)
        return {"answer": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/qa/stream")
async def qa_stream_endpoint(req: QARequest):
    from sse_starlette.sse import EventSourceResponse

    async def event_generator():
        async for token in answer_question_stream(req.question, req.context, req.title_abstract):
            yield {"event": "token", "data": token}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())
