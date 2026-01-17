#!/bin/bash
# Create a new Ralph Loop project from template
# Usage: create-project.sh <project-name>

PROJECT=$1

if [ -z "$PROJECT" ]; then
    echo "Usage: create-project.sh <project-name>"
    exit 1
fi

# Find repo root (look for docker-compose.yml or template/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/../../../.."
if [ ! -f "$REPO_ROOT/docker-compose.yml" ]; then
    echo "Error: Cannot find repo root (docker-compose.yml not found)"
    echo "Run this script from the ralph-wiggum-docker-loop directory"
    exit 1
fi
cd "$REPO_ROOT"

PROJECTS_DIR=".projects"

PROJECT_PATH="$PROJECTS_DIR/$PROJECT"

if [ -d "$PROJECT_PATH" ]; then
    echo "Error: Project '$PROJECT' already exists at $PROJECT_PATH"
    exit 1
fi

# Create projects directory if needed
mkdir -p "$PROJECTS_DIR"

# Copy template
cp -r template/ "$PROJECT_PATH/"

# Create required directories
mkdir -p "$PROJECT_PATH/.project/state"
mkdir -p "$PROJECT_PATH/.project/knowledge/patterns"
mkdir -p "$PROJECT_PATH/.project/knowledge/failures"
mkdir -p "$PROJECT_PATH/.project/knowledge/tools"
mkdir -p "$PROJECT_PATH/.project/specs"
mkdir -p "$PROJECT_PATH/logs"
mkdir -p "$PROJECT_PATH/src"
mkdir -p "$PROJECT_PATH/tests"

# Initialize state
echo '{"current_focus": null, "iteration": 0, "status": "initialized"}' > "$PROJECT_PATH/.project/state/current.json"

# Initialize git
cd "$PROJECT_PATH"
git init
git add -A
git commit -m "Initial project setup"

echo "Created project: $PROJECT"
echo "  Location: $PROJECT_PATH"
echo ""
echo "Next steps:"
echo "1. Edit $PROJECT_PATH/BUILDER_PROMPT.md with your project details"
echo "2. Run: RALPH_PROJECT_DIR=./$PROJECT_PATH docker compose run --rm ralph"
