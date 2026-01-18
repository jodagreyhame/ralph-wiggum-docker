# Changelog

All notable changes to Ralph Wiggum Docker Loop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.7] - 2026-01-18

### Added
- Docker Safety section in CLAUDE.md - rules for verifying container/project before stopping

### Changed
- Codebase review project now uses pre-cloned repo to avoid permission prompts in headless mode

## [0.1.6] - 2026-01-18

### Removed
- `configure.py` - Legacy Python wizard replaced by CLI (`ralph new`)
- `.claude/skills/manage-project/scripts/create-project.sh` - Redundant with CLI
- `.claude/skills/manage-project/scripts/create-project.ps1` - Redundant with CLI

### Changed
- Updated all documentation references from `python configure.py` to `ralph new`
- Updated `scripts/run.sh` and `scripts/run.ps1` error messages to suggest CLI

## [0.1.5] - 2026-01-18

### Changed
- Updated `.claude/skills/manage-project/SKILL.md` - Fixed paths from `orchestrator` to `manage-project`
- Added CLI Commands section to manage-project skill documentation

## [0.1.4] - 2026-01-18

### Added
- CLI Tool section in CLAUDE.md with command reference
- CLI Tests section in CLAUDE.md

### Changed
- Updated Quick Start in CLAUDE.md to use `ralph new` CLI
- Updated Project Structure in CLAUDE.md to reflect current layout

## [0.1.3] - 2026-01-18

### Added
- Cherry-picked CLI/TUI fixes from private repo:
  - CLI documentation improvements
  - Template refactoring
  - Task schema updates

## [0.1.2] - 2026-01-18

### Changed
- Updated README.md with clickable link to interactive flowchart (opens in new tab)
- Added interactive flowchart badge button

## [0.1.1] - 2026-01-18

### Removed
- Debug code from flowchart app (`handleCopyPositions` function and "Copy Positions" button)

## [0.1.0] - 2026-01-18

### Added
- GitHub Actions workflow for deploying flowchart to GitHub Pages (`.github/workflows/deploy-flowchart.yml`)
- Interactive flowchart app at `flowchart/`

### Features
- Docker-based Ralph Loop orchestration
- 3-tier review system (Builder, Reviewer, Architect)
- Multiple auth modes (anthropic-oauth, gemini-oauth, openai-oauth, glm, etc.)
- Provider fallback with automatic switching
- File-based signaling for completion and decisions
- CLI tool (`ralph`) for project management
- Escalation system for consecutive failures

[0.1.7]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/jodagreyhame/ralph-wiggum-docker/releases/tag/v0.1.0
