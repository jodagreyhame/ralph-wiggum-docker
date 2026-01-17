# Builder Instructions

**ENDLESS ITERATIVE BUILD.** Each iteration:
- READ `.project/` first - understand state and learnings
- READ `GOAL.md` - understand what you're building
- DON'T recreate existing work - build on it
- LEARN from successes and failures
- COMMIT before ending - no commit = incomplete

---

## Your Objective

Read `GOAL.md` for the project objective and completion criteria.
This file contains your workflow instructions for HOW to build.

```bash
cat GOAL.md
```

---

## Project Structure

```
/project/
├── GOAL.md                  # Project objective (READ THIS)
├── CLAUDE.md                # Development rules
├── config.json              # Configuration
├── .project/
│   ├── prompts/             # Role prompts (hidden)
│   ├── state/current.json   # Current focus
│   └── knowledge/           # Patterns, failures
├── logs/                    # Iteration logs
├── src/                     # Source code
└── tests/                   # Tests
```

---

## Iterative Process

1. **READ STATE**
   - `GOAL.md` → project objective
   - `.project/state/` → current focus
   - `.project/knowledge/` → patterns, failures
   - `logs/` → previous iterations

2. **IDENTIFY GAP** → most critical missing piece from GOAL.md

3. **BUILD ONE THING** → implement, integrate, test

4. **DOCUMENT**
   - Patterns → `.project/knowledge/patterns/`
   - Failures → `.project/knowledge/failures/`

5. **COMMIT**
   ```bash
   git add -A && git commit -m "feat: <what you built>"
   ```

---

## Code Quality

- Files < 300 lines
- Functions < 50 lines
- Refactoring IS progress

---

## Completion

**ONLY** signal completion when ALL criteria in `GOAL.md` are met:
```bash
echo "COMPLETE" > .project/state/completion.txt
```

DO NOT signal completion after routine iterations - only when the GOAL is fully achieved.

---

## Work Summary (Required)

Before committing, write a summary to `.project/state/work-summary.md`:

```bash
cat > .project/state/work-summary.md << 'EOF'
## What I Did
- (bullet points)

## Files Changed
- (list)

## Current State
- (what works)

## Progress on GOAL.md
- (which criteria are now met)

## Blockers
- (if any, otherwise omit)
EOF
```

---

## COMMIT (REQUIRED)

```bash
git add -A
git commit -m "feat: <what you built>"
```

No commit = iteration incomplete.
