# Changelog

All notable changes to Ralph Wiggum Docker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.1.3] - 2026-01-18

### Fixed
- Rewrite auto-release to run on PRs
## [0.1.2] - 2026-01-18

### Added
- GitHub Actions release automation (auto-release on conventional commits)
- GitHub Actions PR commit validation workflow
- Manual release workflow with version bump options (patch/minor/major)
- Docker Safety section in CLAUDE.md - rules for verifying container before stopping
- CLI `--reviewer-session` flag for setting reviewer session mode

### Changed
- Enhanced CONTRIBUTING.md with comprehensive conventional commit documentation
- Synced package.json version with semantic versioning

### Fixed
- Reviewer now has access to `.project/state/` files
- Resolved codebase inconsistencies from comprehensive review
- Applied critical fixes from codebase review (phases 1-4)
- Script path calculations and Windows compatibility (phase 5)
- Sync script portability improvements (phase 10)

### Improved
- Enhanced config validation (phase 7)
- Updated documentation (phase 8)
- Minor fixes and cleanup (phase 9)
- Rewrote sync script to mirror git commits

## [0.1.1] - 2026-01-18

### Added
- GitHub Actions workflow for deploying flowchart to GitHub Pages
- CLI Tool section in CLAUDE.md with command reference
- CLI Tests section in CLAUDE.md
- Task schema.json to template
- Comprehensive CLI test suite

### Changed
- Updated Quick Start to use `ralph new` CLI instead of `python configure.py`
- Updated manage-project skill paths from `orchestrator` to `manage-project`
- Template now uses config.json as canonical defaults
- README.md with clickable link to interactive flowchart (opens in new tab)

### Removed
- `configure.py` - Legacy Python wizard replaced by CLI (`ralph new`)
- `.claude/skills/manage-project/scripts/create-project.sh` - Redundant with CLI
- `.claude/skills/manage-project/scripts/create-project.ps1` - Redundant with CLI
- Debug code from flowchart app (`handleCopyPositions` function)

## [0.1.0] - 2026-01-18

Initial release.

### Features
- Docker-based Ralph Loop orchestration
- 3-tier review system (Builder, Reviewer, Architect)
- Multiple auth modes (anthropic-oauth, gemini-oauth, openai-oauth, glm, etc.)
- Provider fallback with automatic switching
- File-based signaling for completion and decisions
- CLI tool (`ralph`) for project management
- Escalation system for consecutive failures
- Interactive flowchart app

[0.1.2]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/jodagreyhame/ralph-wiggum-docker/releases/tag/v0.1.0
[0.1.3]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.2...v0.1.3
