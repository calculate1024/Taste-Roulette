# Skill: Dev Audit

Code quality, dependency, performance, and security scanning for the Dev-Lifecycle agent.

## Code Quality Scan

### TODO/FIXME/HACK Detection

```bash
# Find untracked TODO/FIXME/HACK comments
grep -rn "TODO\|FIXME\|HACK\|XXX" apps/ --include="*.ts" --include="*.tsx" --include="*.py" \
  | grep -v "node_modules" | grep -v "__pycache__"
```

For each finding:
1. Check if a GitHub Issue already tracks it
2. If not, note it as a potential optimization item
3. Priority: HACK > FIXME > TODO

### Function Length Analysis

```bash
# TypeScript — find functions > 50 lines (rough heuristic)
# Look for function declarations and check line counts
grep -rn "function\|const.*=.*=>\|async.*=>" apps/api/src/ apps/mobile/ \
  --include="*.ts" --include="*.tsx" | head -50
```

Manual review: scan service files for methods that are clearly too long. Flag any function > 50 lines as a candidate for refactoring.

### Duplicate Code Detection

Look for:
- Similar API route handlers that could share middleware
- Repeated Supabase query patterns that could be extracted
- Copy-pasted utility functions across apps/api and apps/mobile

### Dead Code Detection

```bash
# Find exported functions/types that might be unused
# Check for files with no imports from other files
```

---

## Dependency Audit

### Node.js Dependencies

```bash
# API
cd apps/api && pnpm outdated 2>/dev/null || echo "No pnpm outdated available"
cd apps/api && pnpm audit 2>/dev/null || echo "No audit available"

# Mobile
cd apps/mobile && pnpm outdated 2>/dev/null || echo "No pnpm outdated available"
cd apps/mobile && pnpm audit 2>/dev/null || echo "No audit available"
```

### Python Dependencies

```bash
cd apps/recommender
pip list --outdated 2>/dev/null || echo "pip list not available"
pip-audit 2>/dev/null || echo "pip-audit not installed"
```

### Risk Assessment

| Gap | Risk Level |
|-----|-----------|
| Patch version behind | Low — update at convenience |
| Minor version behind | Low — check changelog |
| 1 major version behind | Medium — plan migration |
| 2+ major versions behind | High — create P2 Issue |
| Known CVE | Critical — create P1 Issue |

---

## Test Coverage Analysis

### Run Tests with Coverage

```bash
# API
cd apps/api && pnpm test --coverage 2>/dev/null || echo "Tests not configured"

# Recommender
cd apps/recommender && python -m pytest --cov=app --cov-report=term-missing 2>/dev/null || echo "Tests not configured"
```

### Coverage Thresholds (from docs/testing-standards.md)

| Module | Target |
|--------|--------|
| API services/ | >= 80% |
| API routes/ | >= 70% |
| Recommender taste_engine.py | >= 90% |
| Mobile components/ | >= 70% |
| Mobile hooks/ | >= 80% |

### Gap Analysis

1. List all API route files → check if corresponding test file exists
2. List all service files → check if corresponding test file exists
3. List all recommender modules → check if test files exist
4. For existing test files, check if coverage meets threshold

---

## Performance Review

### N+1 Query Detection

Scan for patterns like:

```typescript
// BAD: N+1 query pattern
const users = await supabase.from('profiles').select('*');
for (const user of users) {
  const cards = await supabase.from('roulette_cards').select('*').eq('recipient_id', user.id);
}

// GOOD: Join or batch query
const cards = await supabase.from('roulette_cards').select('*, profiles(*)');
```

### Missing Index Detection

Cross-reference common query patterns in `apps/api/src/` with indexes defined in `supabase/migrations/`:

Common query columns to check:
- `roulette_cards.recipient_id` — used in daily card retrieval
- `roulette_cards.status` — used in filtering
- `user_recommendations.used` — used in matching
- `tracks.spotify_id` — used in lookups
- `feedbacks.card_id` — used in feedback retrieval

### Async Pattern Check

```bash
# Find synchronous file operations or blocking calls
grep -rn "readFileSync\|writeFileSync\|execSync" apps/api/src/ --include="*.ts"
```

---

## Security Scan

### Hardcoded Secrets

```bash
# Search for potential hardcoded secrets (exclude .env and .env.example)
grep -rn "sk_\|pk_\|api_key\s*=\s*['\"]" apps/ --include="*.ts" --include="*.tsx" --include="*.py" \
  | grep -v "node_modules" | grep -v ".env" | grep -v "process.env" | grep -v "os.environ"

# Check for base64-encoded strings that might be secrets
grep -rn "eyJ" apps/ --include="*.ts" --include="*.py" | grep -v "node_modules"
```

### Auth Middleware Check

For every route file in `apps/api/src/routes/`:
1. Check if the route uses auth middleware
2. Public routes (health check, etc.) should be explicitly documented
3. Flag any data-accessing route without auth as P1

### SQL Injection Check

```bash
# Find raw SQL queries (should use parameterized queries)
grep -rn "\.rpc\|\.sql\|query(" apps/api/src/ --include="*.ts" | grep -v "node_modules"
```

Verify all database queries use Supabase client (which auto-parameterizes) or explicit parameterized queries.

### .gitignore Verification

Ensure these files are in .gitignore:
- `.env`
- `.env.local`
- `*.pem`
- `credentials.json`
- `serviceAccountKey.json`

---

## Workflow Compliance Check

### Commit Message Format

```bash
# Check recent commits for Conventional Commits compliance
git log --oneline -20 | head -20
```

Valid prefixes: `feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `docs:`, `chore:`, `style:`

### PR Standards

Using GitHub API (via gh CLI or MCP):
1. List open PRs
2. For each PR, check:
   - Has linked Issue?
   - Lines changed < 400?
   - CI status passing?
   - Has been open > 5 days without review?

### Branch Naming

```bash
git branch -r | grep -v "main\|dev\|HEAD"
```

Verify branches follow naming convention: `{type}/{issue-number}-{description}`

---

## Output Format

After completing all scans, compile findings into a structured report:

```markdown
# Dev-Lifecycle Audit — {date}

## Score: {A/B/C/D/F}

## Critical (Immediate Action)
{P1 findings — security, broken tests}

## Important (This Week)
{P2 findings — performance, significant debt}

## Backlog (When Available)
{P3 findings — minor quality improvements}

## Metrics
- Test coverage: API {X}%, Recommender {X}%, Mobile {X}%
- Open optimization Issues: {N}
- Dependencies behind: {N major}, {N minor}
- Workflow compliance: {X}%

## Issues Created Today
{List of new GitHub Issues, or "None — no significant new findings"}
```
