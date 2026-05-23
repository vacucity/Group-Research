from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..prompts.templates import FLASHCARD_PROMPT
from ..services.llm_client import reason_llm

router = APIRouter()


class FlashcardRequest(BaseModel):
    analysis: str = Field(..., min_length=1, max_length=10000)


@router.post("/flashcards/generate")
async def generate_flashcards(req: FlashcardRequest):
    try:
        prompt = FLASHCARD_PROMPT.format(analysis=req.analysis)
        result = await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=2048
        )
        return {"flashcards": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
