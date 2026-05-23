from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.translator import translate, translate_stream

router = APIRouter()


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    target_lang: str = Field(default="Chinese", max_length=50)


@router.post("/translate")
async def translate_text(req: TranslateRequest):
    try:
        result = await translate(req.text, req.target_lang)
        return {"translation": result, "original": req.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate/stream")
async def translate_stream_endpoint(req: TranslateRequest):
    from sse_starlette.sse import EventSourceResponse

    async def event_generator():
        async for token in translate_stream(req.text, req.target_lang):
            yield {"event": "token", "data": token}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())
