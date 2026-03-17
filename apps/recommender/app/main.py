from fastapi import FastAPI
from dotenv import load_dotenv

from .models import (
    ComputeVectorRequest,
    ComputeVectorResponse,
    MatchRequest,
    MatchResult,
)
from .taste_engine import compute_taste_vector, find_sweet_spot_matches

load_dotenv()

app = FastAPI(title="Taste Roulette Recommender", version="0.1.0")


@app.get("/engine/health")
async def health():
    return {"status": "ok", "service": "recommender"}


@app.post("/engine/compute-vector", response_model=ComputeVectorResponse)
async def compute_vector(request: ComputeVectorRequest):
    """Compute/update user taste vector based on responses."""
    vector = compute_taste_vector(request)
    return ComputeVectorResponse(user_id=request.user_id, taste_vector=vector)


@app.post("/engine/match", response_model=list[MatchResult])
async def match(request: MatchRequest):
    """Match recommenders with recipients based on taste distance."""
    matches = find_sweet_spot_matches(
        target_vector=request.target_vector,
        candidates=request.candidates,
        min_dist=request.min_dist,
        max_dist=request.max_dist,
        limit=request.limit,
    )
    return [MatchResult(**m) for m in matches]
