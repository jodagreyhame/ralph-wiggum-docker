# Bootstrap [SYSTEM_NAME]

Design and build [SYSTEM_NAME] from scratch through iterative refinement.

---

## The Loop

```
1. READ  .project/state.json
2. IDENTIFY next incomplete item
3. IMPLEMENT it fully
4. TEST it works
5. UPDATE state.json
6. COMMIT with item ID
7. REPEAT
```

---

## First Run?

No `state.json`? Design the system:
1. What are the core components?
2. What are the dependencies between them?
3. What order must they be built?
4. What does "done" look like for each?

Write design to `.project/DESIGN.md`, then initialize state.

---

## Think Critically

Before implementing anything:

**Is this the right abstraction?**
- Will this need to change when requirements evolve?
- Is this solving the actual problem or a symptom?
- Would a simpler approach work?

**Does this integrate correctly?**
- How does this component talk to others?
- What happens when this fails?
- Are the interfaces clear?

**Is this actually testable?**
- Can you verify it works without the full system?
- What are the edge cases?
- How do you know it's done?

**Are you checking boxes or building?**
- Did you write actual code, or just describe it?
- Does it run, or is it pseudocode?
- Did you test it, or assume it works?

**If uncertain - CLARIFY FIRST.**

---

## Component Checklist

Define your components. Example:

```json
{
  "components": {
    "config_loader": {"status": "pending", "depends_on": []},
    "data_model": {"status": "pending", "depends_on": ["config_loader"]},
    "core_engine": {"status": "pending", "depends_on": ["data_model"]},
    "api_layer": {"status": "pending", "depends_on": ["core_engine"]},
    "cli": {"status": "pending", "depends_on": ["api_layer"]}
  }
}
```

---

## State File

`.project/state.json`:

```json
{
  "iteration": 0,
  "status": "in_progress",
  "current_component": null,
  "components": {},
  "history": []
}
```

---

## Done When

- All components have `"status": "complete"`
- Integration test passes
- No TODO comments remain
- Output: `<promise>SYSTEM_COMPLETE</promise>`
