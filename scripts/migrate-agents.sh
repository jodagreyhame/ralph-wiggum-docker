#!/bin/bash
# Migrate existing projects from CLAUDE.md to AGENTS.md
#
# This script:
# 1. Renames CLAUDE.md to AGENTS.md
# 2. Creates CLAUDE.md as a symlink to AGENTS.md
#
# Usage: ./scripts/migrate-agents.sh [project-name]
#        ./scripts/migrate-agents.sh          # Migrate all projects

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECTS_DIR="$SCRIPT_DIR/../.projects"

migrate_project() {
    local project="$1"
    local claude_md="$project/CLAUDE.md"
    local agents_md="$project/AGENTS.md"

    # Skip if already migrated (CLAUDE.md is a symlink)
    if [ -L "$claude_md" ]; then
        echo "  Skipping $(basename "$project") - already migrated"
        return 0
    fi

    # Skip if no CLAUDE.md exists
    if [ ! -f "$claude_md" ]; then
        echo "  Skipping $(basename "$project") - no CLAUDE.md found"
        return 0
    fi

    # Skip if AGENTS.md already exists
    if [ -f "$agents_md" ]; then
        echo "  Skipping $(basename "$project") - AGENTS.md already exists"
        return 0
    fi

    echo "  Migrating $(basename "$project")..."

    # Rename CLAUDE.md to AGENTS.md
    mv "$claude_md" "$agents_md"

    # Create symlink
    ln -s "AGENTS.md" "$claude_md"

    echo "    Done: CLAUDE.md -> AGENTS.md"
}

echo "AGENTS.md Migration Script"
echo "=========================="
echo ""

if [ -n "$1" ]; then
    # Migrate specific project
    PROJECT="$PROJECTS_DIR/$1"
    if [ -d "$PROJECT" ]; then
        migrate_project "$PROJECT"
    else
        echo "ERROR: Project not found: $1"
        exit 1
    fi
else
    # Migrate all projects
    echo "Migrating all projects in .projects/..."
    echo ""

    for project in "$PROJECTS_DIR"/*/; do
        if [ -d "$project" ]; then
            migrate_project "$project"
        fi
    done
fi

echo ""
echo "Migration complete!"
