---
name: loop-prompt-writer
description: |
  Write effective prompts for iterative research and Ralph loops. Use when:
  - User asks to "write a prompt", "create a bootstrap prompt", "design a research prompt"
  - User wants to create a new Ralph Loop project prompt
  - User asks to "build a prompt", "create an iterative prompt", or "set up a Ralph project"
  - User mentions "Ralph Wiggum", "Ralph Loop", or "iterative development"
  - Any self-improving/endless loop system with state tracking and termination conditions
---

# Loop Prompt Writer

Write prompts for iterative systems that self-improve through repeated execution.

## Quick Start: GOAL.md

Ralph Loop separates the **goal** (project-specific) from the **workflow** (generic prompts).

Ask these questions to write GOAL.md:

1. **What are you building?** (name + one-line description)
2. **What's the concrete goal?** (measurable target)
3. **When is it "done"?** (completion criteria)

## Project Structure

```
project/
├── GOAL.md                    # Project-specific (EDIT THIS)
├── CLAUDE.md                  # Development rules
├── config.json                # Configuration
└── .project/
    └── prompts/               # Generic workflow prompts (DO NOT EDIT)
        ├── BUILDER.md         # Builder workflow
        ├── REVIEWER.md        # Reviewer instructions
        └── ARCHITECT.md       # Architect instructions
```

**Key insight:** Only edit `GOAL.md`. The prompts in `.project/prompts/` are generic and reference GOAL.md for the specific objective.

## GOAL.md Required Sections

| Section | Purpose |
|---------|---------|
| **Objective** | What we're building (one paragraph) |
| **Completion Criteria** | Checkboxes that must ALL be true |
| **Acceptance Tests** | How to verify the project is done |

### Optional Sections (by type)

| Type | Add Sections |
|------|--------------|
| **code** | Commands, APIs, Toolchain, Dependencies |
| **research** | Sources, Techniques, Search Terms |
| **creative** | Story, Characters, World-building, Style |
| **security** | Attack Vectors, References, Benchmarks |

---

## Building the Prompt

### Step 1: Header

```markdown
# {NAME}: {Brief Description}

**ENDLESS ITERATIVE BUILD.** Each iteration:
- READ `.project/` first - understand state and learnings
- DON'T recreate existing work - build on it
- LEARN from successes and failures
- COMMIT before ending - no commit = incomplete
```

### Step 2: The Goal

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

### Step 3: Architecture (Optional)

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

### Step 4: Core Principles

3-5 non-negotiable rules:

```markdown
## Core Principles

1. **No Hardcoded Secrets** - Environment variables only
2. **Real Data Only** - No mocks, no stubs
3. **Fail Loudly** - Clear errors, no silent fallbacks
```

### Step 5: Project Structure

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

### Step 6: The Loop (6 lines max)

Define the exact cycle. Number the steps.

```
1. READ  state file
2. FIX   one thing
3. WRITE files
4. UPDATE state
5. COMMIT
6. REPEAT
```

### Step 7: Critical Thinking Section

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

### Step 8: State File (JSON)

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

### Step 9: Priority Order

```markdown
## Priority

1. **Foundation** - Core infrastructure
2. **Core Features** - Main functionality
3. **Integration** - Connect components
4. **Polish** - Usability, docs
```

### Step 10: Success Criteria

Checkboxes for completion:

```markdown
## Success Criteria

- [ ] {Specific, testable criterion}
- [ ] {Another criterion}
- [ ] {Final criterion}
```

### Step 11: Completion

Signal completion via file:

```markdown
## Completion

When ALL criteria are met, signal completion:

```bash
echo "COMPLETE" > .project/state/completion.txt
```

**Criteria:**
- {Criterion from success criteria}
- {Another}
- {Final}
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Fix |
|--------------|--------------|-----|
| Vague goals | Agent doesn't know when done | Measurable targets |
| Vague checklist items | Checks box without doing work | Specific, measurable criteria |
| No scale questions | System breaks at volume | Add "Does this scale to X?" |
| Empty structure accepted | Boxes checked, content missing | Require populated content |
| No termination | Runs forever | Add promise tag requirement |
| Comments not code | "Do X" vs actual algorithm | Require explicit code/algorithm |
| Long prompts (>200 lines) | Hard to follow | Split into CLAUDE.md rules |
| Too many priorities | Nothing gets done | 4-5 max, ordered |
| **Over-specification** | AI can't adapt, prompt too rigid | Goal + constraints, not implementation |
| **Prescriptive structure** | Locks AI into one approach | Let AI discover through iteration |

---

## Quick Reference

### Examples (filled-in prompts)

Copy and customize these:
- [code-filesync.md](assets/examples/code-filesync.md) - CLI tool example
- [research-api-patterns.md](assets/examples/research-api-patterns.md) - Research project
- [security-audit.md](assets/examples/security-audit.md) - Code security audit

### Templates (with placeholders)

Abstract patterns to adapt:
- [bootstrap-meta.md](assets/templates/bootstrap-meta.md) - System bootstrap
- [refactor-loop.md](assets/templates/refactor-loop.md) - Codebase refactoring
- [research-at-scale.md](assets/templates/research-at-scale.md) - Research at scale

---

## Minimal GOAL.md Template

For simple projects, only edit GOAL.md:

```markdown
# Project Goal

## Objective

{Brief description of what this project should do when complete}

## Completion Criteria

All of the following must be true for the project to be considered complete:

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

## Acceptance Tests

How to verify the project is complete:

1. {Test step 1}
2. {Test step 2}
```

The generic builder prompt in `.project/prompts/BUILDER.md` reads this GOAL.md and handles the iteration workflow.
