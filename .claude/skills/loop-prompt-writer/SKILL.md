---
name: loop-prompt-writer
description: |
  Write effective prompts for iterative research and Ralph Loop projects. Covers both simple projects (GOAL.md only) and advanced projects (custom role prompts for Builder/Reviewer/Architect). Use when: (1) Writing GOAL.md - "write a goal", "create a prompt", "set up a Ralph project", "write completion criteria", (2) Customizing role prompts - "customize builder prompt", "modify reviewer instructions", "add architectural constraints", "customize role workflow", (3) User mentions "Ralph Wiggum", "Ralph Loop", "iterative development", "bootstrap prompt", "endless loop". Provides templates for GOAL.md and role prompts (BUILDER.md, REVIEWER.md, ARCHITECT.md) with placeholder-based customization.
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
    └── prompts/               # Role prompts (CAN BE CUSTOMIZED)
        ├── BUILDER.md         # Builder workflow
        ├── REVIEWER.md        # Reviewer instructions
        └── ARCHITECT.md       # Architect instructions
```

**Key insight:** Most projects only need to edit `GOAL.md`. The default role prompts in `.project/prompts/` are generic and reference GOAL.md.

**Advanced:** For complex projects with specific requirements (e.g., architectural constraints, mandatory code review steps, reference documentation), you can customize the role prompts. See "Customizing Role Prompts" below.

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

For detailed step-by-step instructions, see [building-prompts.md](references/building-prompts.md).

### Quick Overview

| Step | What | Why |
|------|------|-----|
| **1. Header** | Endless iterative build pattern | Sets the iteration mindset |
| **2. The Goal** | What + constraints + test | Destination, not prescription |
| **3. Architecture** | Two-phase or bootstrap patterns (optional) | Only when approach matters |
| **4. Core Principles** | 3-5 non-negotiable rules | Guardrails for iteration |
| **5. Project Structure** | File organization | Orient the AI |
| **6. The Loop** | 6-line cycle definition | Clear iteration steps |
| **7. Critical Questions** | 3-5 hard project-specific questions | Prevent checkbox-without-work |
| **8. State File** | JSON progress tracking | Machine-parseable state |
| **9. Priority Order** | Ordered work phases | What to build when |
| **10. Success Criteria** | Completion checkboxes | When is it done? |
| **11. Completion** | Signal file creation | How to mark complete |

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

---

## Customizing Role Prompts (Advanced)

For projects with specific architectural requirements, mandatory review steps, or reference documentation, you can customize the role prompts in `.project/prompts/`.

### When to Customize

| Customize If... | Examples |
|-----------------|----------|
| **Architectural constraints** | "Must use specific patterns", "Provider-agnostic design required" |
| **Reference documentation** | Links to specs, schemas, API docs that roles should consult |
| **Mandatory first steps** | "Must review existing code first", "Must read security guidelines" |
| **Custom review criteria** | Specific checks beyond code working |
| **Project-specific workflow** | Different iteration process, special state files |

### Role Prompt Templates

See `assets/role-templates/` for customizable examples:
- [BUILDER-template.md](assets/role-templates/BUILDER-template.md) - Builder workflow with placeholders
- [REVIEWER-template.md](assets/role-templates/REVIEWER-template.md) - Reviewer instructions with placeholders
- [ARCHITECT-template.md](assets/role-templates/ARCHITECT-template.md) - Architect review with placeholders

**Placeholders to customize:**
- `{INSERT_PROJECT_SPECIFIC_PRINCIPLES}` - Your non-negotiable requirements
- `{INSERT_REFERENCE_DOCS_TABLE}` - Links to specs, schemas, API docs
- `{INSERT_FIRST_ITERATION_REQUIREMENTS}` - Mandatory first steps (if any)
- `{INSERT_ADDITIONAL_STATE_FILES}` - Extra state files to read
- `{INSERT_ADDITIONAL_QUALITY_STANDARDS}` - Project-specific quality standards
- `{INSERT_ADDITIONAL_REVIEW_STEPS}` - Custom review process steps
- `{INSERT_CUSTOM_CRITERIA}` - Additional architect review criteria
- `{INSERT_CUSTOM_PASS_FAIL_CRITERIA}` - Extra pass/fail rules

Copy these to `.project/prompts/` and customize the placeholders for your project.
