---
model: sonnet
max_iterations: 0
completion_promise: CLI COMPLETE
commit_required: true
knowledge_dir: .project
project_type: code
---

# FileSync: Bidirectional File Synchronization CLI

**ENDLESS ITERATIVE BUILD.** Each iteration:
- READ `.project/` first - understand state and learnings
- DON'T recreate existing work - build on it
- LEARN from successes and failures
- COMMIT before ending - no commit = incomplete

---

## The Goal

Build a fast, reliable CLI for syncing files between local and remote directories.

**Target**: Sync 10,000 files in under 60 seconds with conflict detection.

---

## The Problem

```bash
# Manual sync is error-prone
rsync -avz local/ remote/  # No conflict detection
scp -r local/* remote/     # Overwrites everything
```

## The Solution

```bash
# Smart bidirectional sync
filesync sync ./local s3://bucket/remote --strategy=newer
filesync diff ./local s3://bucket/remote
filesync resolve --interactive
```

---

## Core Principles

1. **No Data Loss** - Never overwrite without confirmation
2. **Fast by Default** - Parallel transfers, delta sync
3. **Provider Agnostic** - Local, S3, GCS, Azure, SFTP

---

## Commands

| Command | Purpose |
|---------|---------|
| `sync` | Bidirectional synchronization |
| `diff` | Show differences |
| `push` | Local → Remote only |
| `pull` | Remote → Local only |
| `resolve` | Handle conflicts |

---

## Priority

1. **Core Sync** - Local ↔ Local sync working
2. **S3 Provider** - AWS S3 support
3. **Conflict Detection** - Identify and handle conflicts
4. **Performance** - Parallel transfers, delta sync

---

## Success Criteria

- [ ] `filesync sync` works for local directories
- [ ] S3 provider implemented and tested
- [ ] Conflict detection identifies all edge cases
- [ ] 10K files sync in <60s benchmark passes

---

## Completion

Output when ALL criteria met:

<promise>CLI COMPLETE</promise>
