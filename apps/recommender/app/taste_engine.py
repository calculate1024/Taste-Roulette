import numpy as np
from typing import Optional

from .models import ComputeVectorRequest, MatchCandidate, SWEET_SPOT_MIN, SWEET_SPOT_MAX


# Reaction weights for taste vector computation
REACTION_WEIGHTS = {"love": 1.0, "okay": 0.3, "not_for_me": -0.5}

# Predefined genre list (~20 major genres)
GENRES = [
    "pop", "rock", "hip-hop", "r&b", "jazz", "classical", "electronic",
    "latin", "country", "folk", "metal", "punk", "indie", "soul",
    "blues", "reggae", "world", "ambient", "k-pop", "j-pop",
]

GENRE_INDEX = {g: i for i, g in enumerate(GENRES)}
VECTOR_DIM = len(GENRES)


def genre_to_vector(genres: list[str]) -> np.ndarray:
    """Convert a list of genre strings to a one-hot-ish vector."""
    vec = np.zeros(VECTOR_DIM)
    for genre in genres:
        genre_lower = genre.lower()
        # Exact match
        if genre_lower in GENRE_INDEX:
            vec[GENRE_INDEX[genre_lower]] = 1.0
            continue
        # Partial match (e.g., "indie rock" matches both "indie" and "rock")
        for g, idx in GENRE_INDEX.items():
            if g in genre_lower or genre_lower in g:
                vec[idx] = 0.5
    return vec


def compute_taste_vector(request: ComputeVectorRequest) -> list[float]:
    """
    Build taste vector from onboarding responses + track genre data.

    Returns:
        Weighted genre preference vector (20 dimensions)
    """
    weighted_sum = np.zeros(VECTOR_DIM)
    weight_total = 0.0

    for resp in request.responses:
        weight = REACTION_WEIGHTS.get(resp.reaction, 0.0)

        genres = request.track_genres.get(resp.track_id, [])
        if not genres:
            continue

        genre_vec = genre_to_vector(genres)
        weighted_sum += weight * genre_vec
        weight_total += abs(weight)

    if weight_total == 0:
        return [0.0] * VECTOR_DIM

    return (weighted_sum / weight_total).tolist()


def taste_distance(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Cosine distance between two taste vectors (expects numpy arrays)."""
    if vec_a.size == 0 or vec_b.size == 0:
        return 1.0
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 1.0
    # Manual cosine distance to avoid redundant norm computation
    return 1.0 - float(np.dot(vec_a, vec_b) / (norm_a * norm_b))


def find_sweet_spot_matches(
    target_vector: list[float],
    candidates: list[MatchCandidate],
    min_dist: float = SWEET_SPOT_MIN,
    max_dist: float = SWEET_SPOT_MAX,
    limit: Optional[int] = None,
) -> list[dict]:
    """
    Find candidates whose taste distance is in the 'surprise sweet spot'.

    Too close (<0.3): not novel enough
    Too far (>0.7): likely to be rejected
    Sweet spot (0.3-0.7): maximum surprise potential

    Returns:
        Candidates sorted by proximity to 0.5 (optimal surprise distance)
    """
    target_arr = np.array(target_vector)
    matches = []

    for candidate in candidates:
        candidate_arr = np.array(candidate.taste_vector)
        dist = taste_distance(target_arr, candidate_arr)
        if min_dist <= dist <= max_dist:
            matches.append({
                "user_id": candidate.user_id,
                "recommendation_id": candidate.recommendation_id,
                "taste_distance": dist,
            })

    # Prefer distance closest to 0.5 (maximum surprise potential)
    matches.sort(key=lambda x: abs(x["taste_distance"] - 0.5))

    if limit:
        matches = matches[:limit]

    return matches
