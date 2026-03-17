from typing import Literal

from pydantic import BaseModel

Reaction = Literal["love", "okay", "not_for_me"]

SWEET_SPOT_MIN = 0.3
SWEET_SPOT_MAX = 0.7


class OnboardingResponseItem(BaseModel):
    track_id: str
    reaction: Reaction


class ComputeVectorRequest(BaseModel):
    user_id: str
    responses: list[OnboardingResponseItem]
    track_genres: dict[str, list[str]]  # {track_id: [genre1, genre2, ...]}


class ComputeVectorResponse(BaseModel):
    user_id: str
    taste_vector: list[float]


class MatchCandidate(BaseModel):
    user_id: str
    taste_vector: list[float]
    recommendation_id: str


class MatchRequest(BaseModel):
    target_user_id: str
    target_vector: list[float]
    candidates: list[MatchCandidate]
    min_dist: float = SWEET_SPOT_MIN
    max_dist: float = SWEET_SPOT_MAX
    limit: int = 1


class MatchResult(BaseModel):
    user_id: str
    recommendation_id: str
    taste_distance: float
