# Detailed Changelog

Full changelog with categorized changes from all commits.

For a summary, see [CHANGELOG.md](../CHANGELOG.md).


## [0.1.13] - 2026-01-20

### Added
- Add self-healing loops with comprehensive test suite

### Fixed
- Skip auto-release for release PRs to prevent infinite loop

### Documentation
- Fix incorrect repo URL and update documentation to match codebase


## [0.1.12] - 2026-01-18

### Added
- Enhance log-tailer and project-status utilities
- Add blessed-based TUI framework
- Add task specification templates
- Integrate dashboard into TUI app and CLI
- Add dashboard state and screen components
- Add utilities for project status and log tailing
- Add Bun runtime to Docker image
- Add role customization and apply progressive disclosure
- Add role prompt customization support to loop-prompt-writer

### Changed
- Update entry point to support blessed and legacy TUI
- Use tag-based changelog instead of PR refs
- Move version bump to merge time instead of PR open
- Cleanup launcher scripts and improve documentation

### Fixed
- Create release PRs instead of pushing directly to main
- Use PAT token to bypass branch protection in auto-release
- Upgrade xml2js to 0.5.0 to fix CVE-2023-0842
- Resolve TypeScript errors in blessed components
- Fix CLI tests to check for actual task files, not just directory
- Fix SCRIPT_DIR path resolution issues in ralph.sh and phases.sh
- Fix auto-release workflow for tag-based changelog (#26)
- Improve tag creation reliability in auto-release
- Use PR base/head SHAs instead of merge commit parents
- Apply oxfmt formatting to all source files
- Use bun run format instead of bunx for consistency
- Resolve shellcheck warnings and auto-release version bumping
- Pin Bun version to 1.3.5 to fix lockfile consistency
- Improve light mode visibility for typing effect and quote SVG

### Documentation
- Simplify release workflow documentation
- Migrate to Bun, add cross-platform run support, and fix entrypoint paths


## [0.1.11] - 2026-01-18

### Fixed
- Skip frozen lockfile for github-actions bot
- Add 'closed' event to auto-release workflow


## [0.1.10] - 2026-01-18

### Fixed
- Add 'closed' event to auto-release workflow


## [0.1.9] - 2026-01-18

### Fixed
- Add 'closed' event to auto-release workflow


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
[0.1.10]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.9...v0.1.10
[0.1.11]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.10...v0.1.11
[0.1.12]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.11...v0.1.12
[0.1.13]: https://github.com/jodagreyhame/ralph-wiggum-docker/compare/v0.1.12...v0.1.13
