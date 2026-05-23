from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..prompts.templates import IDEA_STRUCTURING_PROMPT, REVIEW_OUTLINE_PROMPT, PAPER_SUGGESTION_PROMPT
from ..services.llm_client import reason_llm
import httpx
import json

router = APIRouter()

# Shared HTTP client for external API calls
_http: httpx.AsyncClient | None = None


async def _get_http():
    global _http
    if _http is None:
        _http = httpx.AsyncClient(timeout=httpx.Timeout(30.0))
    return _http


class IdeaStructureRequest(BaseModel):
    idea: str = Field(..., min_length=1, max_length=5000)
    language: str = Field(default="Chinese")


class ReviewOutlineRequest(BaseModel):
    idea: str = Field(..., min_length=1, max_length=5000)
    papers: str = Field(default="")
    language: str = Field(default="Chinese")


@router.post("/research/idea-structure")
async def structure_idea(req: IdeaStructureRequest):
    """AI structures a vague research idea into systematic direction."""
    try:
        prompt = IDEA_STRUCTURING_PROMPT.format(idea=req.idea, language=req.language)
        result = await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=3072
        )
        return {"structured_idea": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PaperSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(default=20, ge=1, le=50)


@router.post("/research/search-papers")
async def search_papers(req: PaperSearchRequest):
    """Search papers via Semantic Scholar, with AI fallback."""
    # Try Semantic Scholar first
    try:
        client = await _get_http()
        ss_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": req.query,
            "limit": min(req.limit, 10),
            "fields": "title,authors,abstract,year,citationCount,externalIds",
        }
        headers = {"User-Agent": "ResearchFlow/0.1 (mailto:research@example.com)"}

        import asyncio

        for attempt in range(2):
            resp = await client.get(ss_url, params=params, headers=headers)
            if resp.status_code == 429:
                if attempt < 1:
                    await asyncio.sleep(3)
                    continue
                raise Exception("rate_limited")
            if resp.status_code == 200:
                break
            raise Exception(f"status_{resp.status_code}")

        data = resp.json()
        papers = []
        for p in data.get("data", []):
            papers.append({
                "title": p.get("title", "Unknown"),
                "authors": ", ".join(a["name"] for a in p.get("authors", [])) if p.get("authors") else None,
                "abstract": p.get("abstract") or None,
                "year": p.get("year") or None,
                "citationCount": p.get("citationCount") or None,
                "source": "semantic_scholar",
                "sourceId": p.get("paperId") or p.get("externalIds", {}).get("DOI"),
            })
        return {"papers": papers, "total": data.get("total", 0), "source": "semantic_scholar"}
    except Exception:
        pass

    # Fallback: AI-generated paper suggestions
    try:
        prompt = PAPER_SUGGESTION_PROMPT.format(idea=req.query, language="English")
        result = await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=2048
        )
        # Parse AI output into paper objects
        papers = _parse_ai_papers(result)
        return {"papers": papers, "total": len(papers), "source": "ai_suggestions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _parse_ai_papers(text: str) -> list[dict]:
    """Parse AI-generated paper suggestions into structured paper objects."""
    papers = []
    current = {}
    for line in text.split("\n"):
        line = line.strip()
        if line.startswith("**Title**") or line.startswith("**Title:**"):
            if current.get("title"):
                papers.append(current)
            current = {"title": line.split(":", 1)[-1].strip().lstrip("*").strip()}
        elif line.startswith("**Authors**") or line.startswith("**Authors:**"):
            current["authors"] = line.split(":", 1)[-1].strip()
        elif line.startswith("**Year**") or line.startswith("**Year:**"):
            try:
                current["year"] = int(line.split(":", 1)[-1].strip().strip("*").strip()[:4])
            except ValueError:
                current["year"] = None
        elif line.startswith("**Abstract**") or line.startswith("**Abstract:**"):
            current["abstract"] = line.split(":", 1)[-1].strip()
        elif current.get("abstract") and line and not line.startswith("**"):
            current["abstract"] += " " + line
    if current.get("title"):
        papers.append(current)

    # Fill defaults
    for p in papers:
        p.setdefault("authors", None)
        p.setdefault("abstract", None)
        p.setdefault("year", None)
        p.setdefault("citationCount", None)
        p["source"] = "ai_suggestion"
        p["sourceId"] = None
    return papers


@router.post("/research/review-outline")
async def generate_review_outline(req: ReviewOutlineRequest):
    """AI generates a literature review outline from idea + papers."""
    try:
        prompt = REVIEW_OUTLINE_PROMPT.format(
            idea=req.idea,
            papers=req.papers if req.papers else "No papers collected yet.",
            language=req.language,
        )
        result = await reason_llm.chat(
            [{"role": "user", "content": prompt}], max_tokens=3072
        )
        return {"outline": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
