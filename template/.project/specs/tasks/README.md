# Task Specifications Directory

This directory contains JSON task specification files for structured task management.

## File Structure

```
specs/tasks/
├── schema.json          # JSON Schema for validation
├── summary.json         # Aggregate stats (auto-generated)
├── phase-00-*.json      # Phase 0 tasks
├── phase-01-*.json      # Phase 1 tasks
└── ...
```

## Phase File Format

Each `phase-XX-name.json`:

```json
{
  "phase": 0,
  "name": "Bootstrap",
  "description": "Phase description",
  "tasks": [
    {
      "id": "0.1",
      "name": "Task name",
      "description": "Task description",
      "status": "pending",
      "provider": "glm",
      "complexity": "S",
      "depends_on": []
    }
  ]
}
```

## Status Values
- `pending` - Not started
- `in_progress` - Currently being worked on
- `completed` - Done
- `blocked` - Cannot proceed (requires `blocked_reason`)

## Complexity
- `S` - Small (< 1 hour)
- `M` - Medium (1-4 hours)
- `L` - Large (> 4 hours)

## Usage

Enable task mode with:
```bash
RALPH_TASK_MODE=true
```
