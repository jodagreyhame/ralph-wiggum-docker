# Detailed Changelog

Full changelog with categorized changes from all commits.

For a summary, see [CHANGELOG.md](../CHANGELOG.md).


## [0.1.9] - 2026-01-18

### Fixed
- Skip frozen lockfile for github-actions bot


## [0.1.8] - 2026-01-18

### Fixed
- Remove oxlint type-aware flag and fix shellcheck warnings


## [0.1.7] - 2026-01-18

### Fixed
- Add missing SessionMode type import


## [0.1.6] - 2026-01-18

### Fixed
- Fix workflow issues and hide sync-public script
- Handle Dependabot PRs in workflow


## [0.1.5] - 2026-01-18

### Fixed
- Remove remaining heredocs from workflow
- Fix YAML syntax in heredocs
- Rewrite auto-release to run on PRs

### Documentation
- Add release workflow with manual version control


## [0.1.4] - 2026-01-18

### Fixed
- Remove remaining heredocs from workflow
- Fix YAML syntax in heredocs
- Rewrite auto-release to run on PRs

### Documentation
- Add release workflow with manual version control

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
[0.1.4]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.3...v0.1.4
[0.1.5]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.4...v0.1.5
[0.1.6]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.5...v0.1.6
[0.1.7]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.6...v0.1.7
[0.1.8]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.7...v0.1.8
[0.1.9]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.8...v0.1.9
