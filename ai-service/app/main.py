from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import settings
from .routers import translate, analyze, qa, vision, flashcards, research

app = FastAPI(title="ResearchFlow AI Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


async def verify_api_key(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    if not credentials or credentials.credentials != settings.ai_service_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


app.include_router(translate.router, dependencies=[Depends(verify_api_key)])
app.include_router(analyze.router, dependencies=[Depends(verify_api_key)])
app.include_router(qa.router, dependencies=[Depends(verify_api_key)])
app.include_router(vision.router, dependencies=[Depends(verify_api_key)])
app.include_router(flashcards.router, dependencies=[Depends(verify_api_key)])
app.include_router(research.router, dependencies=[Depends(verify_api_key)])


@app.get("/health")
async def health():
    return {"status": "ok"}
