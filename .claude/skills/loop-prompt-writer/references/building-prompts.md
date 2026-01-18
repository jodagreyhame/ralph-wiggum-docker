# Building Loop Prompts: Step-by-Step Guide

This guide provides detailed instructions for building effective iterative loop prompts.

## Table of Contents

1. [Header](#step-1-header)
2. [The Goal](#step-2-the-goal)
3. [Architecture (Optional)](#step-3-architecture-optional)
4. [Core Principles](#step-4-core-principles)
5. [Project Structure](#step-5-project-structure)
6. [The Loop](#step-6-the-loop-6-lines-max)
7. [Critical Thinking Section](#step-7-critical-thinking-section)
8. [State File (JSON)](#step-8-state-file-json)
9. [Priority Order](#step-9-priority-order)
10. [Success Criteria](#step-10-success-criteria)
11. [Completion](#step-11-completion)

---

## Step 1: Header

```markdown
# {NAME}: {Brief Description}

**ENDLESS ITERATIVE BUILD.** Each iteration:
- READ `.project/` first - understand state and learnings
- DON'T recreate existing work - build on it
- LEARN from successes and failures
- COMMIT before ending - no commit = incomplete
```

---

## Step 2: The Goal

**Goal-focused, not prescriptive.** Describe:
- **What** we're building (the destination)
- **Constraints** that must be true
- **Test** that proves it works

Let the AI discover HOW through iteration.

```markdown
## The Goal

{What we're building - be concise}

**Target**: {Measurable outcome}

**Test**: {Concrete way to verify success}
```

**Bad**: 200 lines describing exact pipeline stages, tools, file structures
**Good**: 20 lines describing goal, constraints, and success test

---

## Step 3: Architecture (Optional)

Only add architecture requirements when they actually matter:

**Two-Phase Pattern** (for complex processing):
```markdown
## Architecture

### Phase 1: Code + Database (80%+)
Deterministic, pattern-based processing

### Phase 2: AI Skills (~20%)
For what requires intelligence

Goal: Maximize Phase 1, minimize AI dependency.
```

**Bootstrap Pattern** (for learning from data):
```markdown
## Approach

Don't guess. Learn by doing:
1. Process known inputs
2. Track every transformation
3. Build patterns from observations
```

Skip this section if the AI can figure out the approach itself.

---

## Step 4: Core Principles

3-5 non-negotiable rules:

```markdown
## Core Principles

1. **No Hardcoded Secrets** - Environment variables only
2. **Real Data Only** - No mocks, no stubs
3. **Fail Loudly** - Clear errors, no silent fallbacks
```

---

## Step 5: Project Structure

```markdown
## Project Structure

/project/
├── GOAL.md                  # Project objective (EDIT THIS)
├── CLAUDE.md                # Development rules
├── config.json              # Configuration
├── .project/                # State & knowledge
│   ├── prompts/             # Role prompts (DO NOT EDIT)
│   ├── state/current.json   # Current focus
│   └── knowledge/           # Patterns, failures
├── logs/                    # Iteration logs
└── src/                     # Source code
```

---

## Step 6: The Loop (6 lines max)

Define the exact cycle. Number the steps.

```
1. READ  state file
2. FIX   one thing
3. WRITE files
4. UPDATE state
5. COMMIT
6. REPEAT
```

---

## Step 7: Critical Thinking Section

**Prevents checkbox-without-work.** Add 3-5 hard questions specific to YOUR project:

```markdown
## Critical Questions

Before marking anything complete, verify:

- {Does X actually work, or just look like it works?}
- {What happens at scale / edge cases?}
- {Is the output actually usable for its purpose?}

**If "no" or "maybe" - FIX IT FIRST.**
```

Keep questions specific to what could go wrong in THIS project.

---

## Step 8: State File (JSON)

Machine-parseable progress tracking:

```json
{
  "iteration": 0,
  "status": "in_progress",
  "checklist": {
    "item_one": false,
    "item_two": false
  },
  "history": []
}
```

---

## Step 9: Priority Order

```markdown
## Priority

1. **Foundation** - Core infrastructure
2. **Core Features** - Main functionality
3. **Integration** - Connect components
4. **Polish** - Usability, docs
```

---

## Step 10: Success Criteria

Checkboxes for completion:

```markdown
## Success Criteria

- [ ] {Specific, testable criterion}
- [ ] {Another criterion}
- [ ] {Final criterion}
```

---

## Step 11: Completion

Signal completion via file:

```markdown
## Completion

When ALL criteria are met, signal completion:

\`\`\`bash
echo "COMPLETE" > .project/state/completion.txt
\`\`\`

**Criteria:**
- {Criterion from success criteria}
- {Another}
- {Final}
```
