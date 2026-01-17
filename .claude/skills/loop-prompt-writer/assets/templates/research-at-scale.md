# Research at Scale

> Systematically research and document [DOMAIN] until complete. Never give up.

## Output Structure

```
.project/
├── findings/                 # Research documentation (1 file per topic)
│   ├── topic-a.jsonl
│   ├── topic-b.jsonl
│   └── {topic-id}.jsonl
├── state/
│   ├── research.json         # Progress tracking
│   └── covered_topics.txt    # Topics already documented
└── taxonomy.json             # Topic index
```

## Finding Schema

Every research finding is a JSON object:

```json
{
  "id": "sha256-of-title-normalized",
  "topic": "topic-a",
  "title": "Specific Aspect of Topic A",
  "content": {
    "summary": "1-2 paragraphs explaining the finding",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "examples": ["Concrete example 1"],
    "implications": ["What this means for X", "How this affects Y"],
    "open_questions": ["What remains unknown", "Areas for further research"]
  },
  "depth": 3,
  "documented_at": "ISO-timestamp"
}
```

## Research Rules

### Starting Point

Read `taxonomy.json` to get the topic list. Each topic has:
- `id`: unique identifier
- `priority`: 1-10 (focus on high priority first)
- `subtopics`: list of related areas to research

### Research Loop

For each topic by priority:

1. **Research main topic** → append to `findings/{topic-id}.jsonl`
2. **Research each subtopic** → same file
3. **Track coverage** → add to `covered_topics.txt`
4. **Update research.json** → track progress

### Avoiding Duplicate Work

Before documenting any finding:
```
hash = sha256(title.lower().strip())
if hash in covered_topics.txt:
    SKIP (already covered)
else:
    WRITE finding
    APPEND hash to covered_topics.txt
```

### Completion Signals (MOVE ON when you see these)

- **No more substantive information available** → topic exhausted
- **Repeating the same points with different words** → move on
- **Speculating without basis** → stop, document what's known
- **Depth > 10 without new insights** → exhausted

## Critical Thinking (REQUIRED each iteration)

Before writing ANY finding, answer in your thinking:

```
1. IS THIS SUBSTANTIVE? Does this add real value to the documentation?
   - Yes → proceed
   - No/unsure → skip this aspect

2. IS THIS DISTINCT? Is this different from what's already documented?
   - Yes → proceed
   - No → skip (mark as already covered)

3. IS THIS COMPLETE? Can I provide examples and implications?
   - Yes → proceed
   - No → document what's known, note gaps
```

## State File Format

### research.json
```json
{
  "total_findings": 0,
  "topics_completed": [],
  "topics_in_progress": [],
  "topics_remaining": [],
  "last_updated": "ISO-timestamp"
}
```

### covered_topics.txt
```
# One hash per line - topics already documented
a1b2c3d4e5f6...
f6e5d4c3b2a1...
```

## Iteration Protocol

Each iteration:

1. **READ** research.json → find next incomplete topic
2. **READ** taxonomy.json → get topic's subtopics
3. **RESEARCH** main topic + all subtopics → append to JSONL
4. **TRACK** each finding → update covered_topics.txt
5. **UPDATE** research.json → mark topic complete
6. **COMMIT** changes with message: `docs(research): {topic-id} - {n} findings`

## Termination

Output `<promise>RESEARCH COMPLETE</promise>` when:
- All high-priority topics are in `topics_completed`
- OR all accessible information has been documented

## Anti-Patterns (NEVER DO)

- ❌ Don't speculate without basis
- ❌ Don't write generic filler ("X is important")
- ❌ Don't repeat the same point with different words
- ❌ Don't claim completeness when gaps exist
- ❌ Don't skip the critical thinking checks

## Quality Bar

Every finding must have:
- [ ] Substantive summary (not generic)
- [ ] At least 2 key points
- [ ] At least 1 concrete example
- [ ] Honest acknowledgment of gaps/unknowns

If you can't meet this bar → note the gap and move on.

## Bootstrap: Initialize State

If `research.json` doesn't exist, create it:
```json
{
  "total_findings": 0,
  "topics_completed": [],
  "topics_in_progress": [],
  "topics_remaining": ["topic-a", "topic-b", ...],
  "last_updated": "2026-01-16T00:00:00Z"
}
```

If `covered_topics.txt` doesn't exist, create empty file with header:
```
# Research coverage tracking
```

## Example Finding Output

```json
{"id":"7b2c9...","topic":"distributed-systems","title":"CAP Theorem Trade-offs","content":{"summary":"The CAP theorem states that distributed systems can only guarantee two of three properties: Consistency, Availability, and Partition tolerance. Since network partitions are unavoidable, practical systems must choose between consistency and availability during failures.","key_points":["CP systems prioritize consistency (e.g., traditional databases with strong consistency)","AP systems prioritize availability (e.g., eventually consistent systems like Cassandra)","The choice depends on business requirements and failure tolerance"],"examples":["Banking systems often choose CP - better to be unavailable than show wrong balance","Social media feeds often choose AP - showing slightly stale data is acceptable"],"implications":["System architects must understand their consistency requirements","Different parts of a system can make different trade-offs"],"open_questions":["How do CRDT-based systems change this calculus?","What are the latency implications of each choice?"]},"depth":2,"documented_at":"2026-01-16T00:00:00Z"}
```

---

**START**: Read taxonomy.json, pick highest priority incomplete topic, research it, document findings.
