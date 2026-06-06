from fastapi import APIRouter
from pydantic import BaseModel, Field
from ..prompts.templates import (
    WRITE_OUTLINE_PROMPT,
    WRITE_SECTION_PROMPT,
    SECTION_GUIDELINES,
    CITATION_SUGGEST_PROMPT,
    CITATION_MISSING_PROMPT,
)
from ..services.llm_client import reason_llm

router = APIRouter()


class OutlineRequest(BaseModel):
    idea: str = Field(..., min_length=1, max_length=5000)
    literature: str = Field(default="")
    language: str = Field(default="Chinese")
    venue: str = Field(default="General Conference / Journal")


class WriteSectionRequest(BaseModel):
    section_title: str = Field(..., min_length=1, max_length=500)
    section_type: str = Field(
        default="body",
        description="abstract, introduction, related_work, methodology, experiments, conclusion, body",
    )
    action: str = Field(
        default="generate",
        description="generate, improve, expand, summarize",
    )
    title: str = Field(default="")
    abstract: str = Field(default="")
    context: str = Field(default="")
    literature: str = Field(default="")
    existing_content: str = Field(default="")
    language: str = Field(default="Chinese")


class CitationSuggestRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    literature: str = Field(..., min_length=1)
    limit: int = Field(default=5, ge=1, le=10)


class CitationMissingRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    existing_citations: str = Field(default="")


@router.post("/write/outline")
async def generate_outline(req: OutlineRequest):
    """Generate a structured paper outline from a research idea and literature."""
    prompt = WRITE_OUTLINE_PROMPT.format(
        idea=req.idea,
        literature=req.literature or "No specific literature provided yet.",
        venue=req.venue,
        language=req.language,
    )
    result = await reason_llm.chat(
        [{"role": "user", "content": prompt}], max_tokens=3072
    )
    return {"outline": result}


@router.post("/write/section")
async def write_section(req: WriteSectionRequest):
    """Generate or improve a section with AI."""
    guidelines = SECTION_GUIDELINES.get(req.section_type, SECTION_GUIDELINES["body"])

    action_map = {
        "generate": f"Write a complete draft of the '{req.section_title}' section",
        "improve": f"Improve and polish the following '{req.section_title}' section",
        "expand": f"Expand the following '{req.section_title}' section with more detail",
        "summarize": f"Summarize and condense the following '{req.section_title}' section",
    }
    action_description = action_map.get(req.action, action_map["generate"])

    existing = ""
    if req.existing_content:
        existing = f"\nCurrent content to {req.action}:\n{req.existing_content}"

    prompt = WRITE_SECTION_PROMPT.format(
        action_description=action_description,
        title=req.title or "Untitled Manuscript",
        abstract=req.abstract or "No abstract yet.",
        context=req.context or "No other sections written yet.",
        literature=req.literature or "No specific literature provided.",
        section_title=req.section_title,
        section_type=req.section_type,
        existing_content=existing,
        specific_guidelines=guidelines,
    )

    result = await reason_llm.chat(
        [{"role": "user", "content": prompt}], max_tokens=4096
    )
    return {"content": result, "section_type": req.section_type}


@router.post("/write/citations/suggest")
async def suggest_citations(req: CitationSuggestRequest):
    """Recommend citations for a text passage."""
    prompt = CITATION_SUGGEST_PROMPT.format(
        text=req.text,
        literature=req.literature,
        limit=req.limit,
    )
    result = await reason_llm.chat(
        [{"role": "user", "content": prompt}], max_tokens=2048
    )
    return {"suggestions": result}


@router.post("/write/citations/missing")
async def detect_missing_citations(req: CitationMissingRequest):
    """Detect claims that need citations."""
    prompt = CITATION_MISSING_PROMPT.format(
        text=req.text,
        existing_citations=req.existing_citations or "None",
    )
    result = await reason_llm.chat(
        [{"role": "user", "content": prompt}], max_tokens=2048
    )
    return {"missing": result}
