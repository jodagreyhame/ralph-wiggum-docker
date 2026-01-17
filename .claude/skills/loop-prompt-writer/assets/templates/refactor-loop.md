# Refactor [CODEBASE/MODULE]

Systematically improve [TARGET] through iterative refactoring.

---

## The Loop

```
1. READ  .refactor/state.json
2. SCAN  for next issue (by priority)
3. FIX   one issue completely
4. TEST  nothing broke
5. UPDATE state.json
6. COMMIT with issue type
7. REPEAT
```

---

## First Run?

No `state.json`? Analyze the codebase:
1. Run linter, collect all warnings
2. Identify files > 300 lines
3. Find functions > 50 lines
4. Detect code duplication
5. List TODO/FIXME comments

Write findings to `.refactor/ANALYSIS.md`, initialize state.

---

## Priority Order

Fix issues in this order:
1. **Security** - Vulnerabilities, exposed secrets
2. **Bugs** - Incorrect behavior
3. **Breaking** - API changes needed
4. **Complexity** - Files/functions too large
5. **Duplication** - Repeated code
6. **Style** - Inconsistent patterns
7. **TODOs** - Unfinished work

---

## Think Critically

Before each refactor:

**Will this break anything?**
- What depends on this code?
- Are there tests covering this?
- What's the blast radius if wrong?

**Is this the minimal change?**
- Don't over-engineer
- Don't add features while refactoring
- One concern per commit

**Did you actually test it?**
- Run the tests
- Manual verification if no tests
- Check edge cases

**Are you making progress?**
- Each iteration should close an issue
- If stuck, move to next issue
- Track blockers separately

---

## State File

`.refactor/state.json`:

```json
{
  "iteration": 0,
  "status": "in_progress",
  "issues": {
    "security": [],
    "bugs": [],
    "complexity": [],
    "duplication": [],
    "style": [],
    "todos": []
  },
  "fixed": [],
  "blocked": [],
  "history": []
}
```

---

## Done When

- All priority 1-3 issues resolved
- No files > 300 lines (or documented exceptions)
- No functions > 50 lines
- Tests pass
- Output: `<promise>REFACTOR_COMPLETE</promise>`
