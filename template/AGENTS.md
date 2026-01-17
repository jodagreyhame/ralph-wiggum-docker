# Project Development Rules

## Critical Rules

### DO NOT EDIT (during iterations)
- AGENTS.md - Development rules (canonical)
- CLAUDE.md - Symlink to AGENTS.md (for Claude Code compatibility)
- GOAL.md - Project completion criteria
- .project/prompts/* - Role prompts (hidden)

### MANDATORY PRACTICES

1. **No Mock Data** - Real implementations only
2. **No Silent Fallbacks** - Fail loudly with clear errors
3. **No TODO Comments** - Fix now or create tracked issue
4. **No Hardcoded Secrets** - Environment variables only
5. **No Destructive Ops** - Verify before delete/overwrite
6. **No Skipping Dependencies** - Build dependencies first

## Code Standards

- Files < 300 lines, Functions < 50 lines
- Clear names, no abbreviations
- Comments explain WHY, not WHAT

## Project Structure

```
/project/                    # Container working directory
├── GOAL.md                  # Project objective (DO NOT EDIT)
├── AGENTS.md                # This file (DO NOT EDIT)
├── CLAUDE.md -> AGENTS.md   # Symlink for Claude Code
├── config.json              # Project configuration
├── .project/                # State & knowledge
│   ├── prompts/             # Role prompts (DO NOT EDIT)
│   │   ├── BUILDER.md       # Builder workflow
│   │   ├── REVIEWER.md      # Reviewer instructions
│   │   └── ARCHITECT.md     # Architect instructions
│   ├── state/current.json   # Current focus
│   ├── knowledge/           # Patterns, failures, tools
│   └── specs/               # Specifications
├── logs/                    # Iteration logs
│   └── iteration_XXX/
├── src/                     # Source code
└── tests/                   # Tests
```

## Git Workflow

```bash
git status              # Check changes
git diff                # Review
git add -A
git commit -m "type: description"
```

Types: feat, fix, refactor, docs, test, chore

## Priorities

1. Fix broken things first
2. Complete core features
3. Refactor for quality
4. Document as you go
