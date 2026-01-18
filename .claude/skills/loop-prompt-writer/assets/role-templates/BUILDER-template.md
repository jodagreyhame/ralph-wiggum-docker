# Builder Instructions

**ENDLESS ITERATIVE BUILD.** Each iteration:
- READ state files first - understand current progress
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

## Core Principles (Non-Negotiables)

**You MUST follow these requirements:**

{INSERT_PROJECT_SPECIFIC_PRINCIPLES}

Examples:
- **No Hardcoded Secrets** - Environment variables only
- **Real Data Only** - No mocks, no stubs, no placeholders
- **Fail Loudly** - Clear errors, no silent fallbacks
- **{Your custom principle}** - {Description}

---

## Reference Documentation (Optional)

**Read these specs before implementing:**

{INSERT_REFERENCE_DOCS_TABLE}

Example:
| Principle | Reference Doc |
|-----------|---------------|
| **API Spec** | `.project/reference/api-spec.md` |
| **Database Schema** | `.project/reference/schema.md` |
| **Architecture** | `.project/reference/architecture.md` |

---

## First Iteration Requirements (Optional)

{INSERT_FIRST_ITERATION_REQUIREMENTS}

Example for projects with reference codebases:
```markdown
## FIRST ITERATION: Codebase Review (MANDATORY)

**If `.project/knowledge/codebase-review.md` does NOT exist, your ONLY task is to create it.**

Before writing ANY code, you MUST:
1. Explore reference implementations
2. Document findings in `.project/knowledge/codebase-review.md`
3. Commit the review - this IS your first iteration's deliverable
```

---

## Project Structure

```
/project/
├── GOAL.md                    # Project objective (READ THIS)
├── CLAUDE.md                  # Development rules
├── config.json                # Configuration
├── .project/                  # {Your state directory name}
│   ├── state/current.json     # Current focus
│   ├── knowledge/             # Patterns, failures
│   └── reference/             # Specs, docs (if applicable)
├── logs/                      # Iteration logs
└── src/                       # Source code
```

---

## Iterative Process

1. **READ STATE**
   - `GOAL.md` → project objective
   - `.project/state/` → current focus
   - `.project/knowledge/` → patterns, failures
   - `logs/` → previous iterations
   {INSERT_ADDITIONAL_STATE_FILES}

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

{INSERT_ADDITIONAL_QUALITY_STANDARDS}

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
