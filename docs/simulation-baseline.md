# Simulation Baseline Report

> Date: 2026-03-19 | Method: In-memory behavioral simulation, 3 runs averaged per scenario
> Track pool: 499 tracks | Personas: 100 (21 genres balanced)

## Methodology

Behavioral model where feedback is driven by taste distance (not random):
- Reaction probabilities vary by distance bucket (too_close → too_far)
- Open rate decays daily (-3%), boosted by past "surprised" (+8%), penalized by "not_for_me" (-12%)
- 2+ consecutive bad reactions → 30% churn probability per day
- Recommend-back: 50% after surprised, 20% after okay, 5% after not_for_me

**Limitation**: This validates system mechanics, not the taste model itself. The behavioral probabilities are assumptions — only real user data can validate them.

## Comparative Results

| Scenario | Open% | Surprise% | NotForMe% | D7 Ret% | Recs |
|----------|-------|-----------|-----------|---------|------|
| A) Current (0.3-0.7) | 79% | 33% | 37% | 67% | 115 |
| B) Full Range (no filter) | 79% | 31% | 38% | 70% | 115 |
| C) Tighter (0.3-0.55) | 77% | 32% | 39% | 63% | 121 |
| D) Cold Start (10 users) | 79% | 36% | 32% | 60% | 13 |
| E) Current + Genre Penalty | 78% | 29% | 42% | 68% | 110 |

## Key Findings

### 1. Distance filter has minimal impact on aggregate metrics

A vs B (with filter vs without) are nearly identical: 33% vs 31% surprise, 67% vs 70% D7 retention. This is because **most cards already fall in sweet_low/sweet_high regardless of filter** — the genre vector space naturally clusters most user-to-track distances in the 0.35-0.65 range.

**Implication**: The 0.3-0.7 filter is working as a safety net (blocks extreme outliers), not as a precision tool. Keep it, but don't expect it to dramatically improve experience.

### 2. Tighter sweet spot (C) doesn't help

Narrowing to 0.3-0.55 actually *worsened* D7 retention (63% vs 67%) and barely changed surprise rate (32% vs 33%). The filter is too restrictive — it reduces the candidate pool without meaningful quality improvement.

**Decision: Keep current 0.3-0.7 range. Do NOT tighten.**

### 3. The real problem is sweet_high (0.5-0.65)

Across all scenarios, the sweet_high bucket consistently shows ~35% surprise but ~35% not_for_me. This is the highest-volume bucket (230-240 cards per run). Half the users love it, half don't.

| Bucket | Volume | Surprise | Not For Me |
|--------|--------|----------|------------|
| sweet_low (0.35-0.5) | ~163 | **36-43%** | **19-22%** |
| sweet_high (0.5-0.65) | ~236 | 33-37% | 34-38% |

**Implication**: sweet_low is clearly the best zone. If we can shift more cards into 0.35-0.5, we'd improve experience. This could be done by:
- Weighting the matching algorithm to prefer dist closer to 0.4 (not 0.5)
- Adding a "prefer lower distance" tiebreaker in curator fallback

### 4. Cold start (D) is viable but fragile

10 users with curator-only had 36% surprise and 60% D7 retention — surprisingly close to the full 100-user scenario. However:
- Only 33 cards hit sweet_high, 14 hit sweet_low — small sample
- 3 of 10 users churned (30%) — one bad run of cards kills a user
- Rec pool grew from 0 → 13 via behavioral recommend-back

**Implication**: Curator quality is critical for cold start. The first 3-5 cards a user receives determine retention. Curate the initial pool carefully.

### 5. Genre repeat penalty (E) worsens everything

Adding genre repeat penalty increased not_for_me from 37% to 42% and decreased surprise from 33% to 29%, with minimal retention change (67% → 68%).

**Decision: Do NOT add genre repeat penalty.** The current genre vector approach already produces enough variety. The penalty just makes "okay" reactions worse without helping.

### 6. too_far cards persist (~15% of all cards)

In every scenario, 75-90 cards land at distance >0.8. These have 78-83% not_for_me rate. They come from user recommendations where the recommender and recipient have very different tastes.

**Action item**: Add a hard distance cap of 0.75 on user-to-user recommendations. If taste distance between recommender and recipient exceeds 0.75, use curator fallback instead.

## Recommended Changes

| Priority | Change | Expected Impact |
|----------|--------|-----------------|
| **P0** | Add hard cap: reject user recs where recipient distance > 0.75 | Eliminate ~15% of bad cards |
| **P1** | Shift matching preference toward 0.4 center (not 0.5) | More cards in sweet_low zone |
| **P2** | Keep 0.3-0.7 range as-is | Already validated |
| **Skip** | Do NOT tighten to 0.3-0.55 | Worsens retention |
| **Skip** | Do NOT add genre repeat penalty | Worsens surprise rate |

## Daily Decay Curve (Scenario A baseline)

| Day | Open Rate | Skipped |
|-----|-----------|---------|
| 1 | 93% | 7 |
| 2 | 86% | 14 |
| 3 | 80% | 20 |
| 4 | 75% | 25 |
| 5 | 79% | 21 |
| 6 | 68% | 32 |
| 7 | 68% | 32 |

Note: Day 5 bounce-back is due to users who got "surprised" on Day 4 returning. This positive feedback loop is the core retention mechanism.

## Next Steps

1. Implement P0 (distance cap 0.75 on user recs)
2. Implement P1 (prefer 0.4 center in matching)
3. Re-run simulation to verify improvement
4. Compare with real beta user data when available
