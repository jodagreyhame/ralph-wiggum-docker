#!/bin/bash
# Create a new Ralph Loop project
# Usage: create-project.sh <project-name> [--preset=<preset>]
#
# This script wraps the ralph CLI for convenience.

PROJECT=$1
shift
EXTRA_ARGS="$@"

if [ -z "$PROJECT" ]; then
    echo "Usage: create-project.sh <project-name> [--preset=<preset>]"
    echo ""
    echo "Presets: minimal, standard, three-tier, full"
    exit 1
fi

# Find repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/../../../.."
cd "$REPO_ROOT"

# Use the CLI
exec ralph new "$PROJECT" $EXTRA_ARGS
