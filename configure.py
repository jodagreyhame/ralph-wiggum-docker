#!/usr/bin/env python3
"""
Ralph Wiggum Docker Loop - Project Bootstrap & Configuration

Interactive REPL to create new project instances.
Copies template files to .projects/{project-name}/ and configures settings.
"""

import json
import shutil
import sys
from pathlib import Path

# Try to import questionary, fall back to simple input if not available
try:
    import questionary
    from questionary import Style
    HAS_QUESTIONARY = True
except ImportError:
    HAS_QUESTIONARY = False
    print("Note: Install 'questionary' for a better experience: pip install questionary")

# Custom style for questionary
custom_style = Style([
    ('qmark', 'fg:cyan bold'),
    ('question', 'bold'),
    ('answer', 'fg:green bold'),
    ('pointer', 'fg:cyan bold'),
    ('highlighted', 'fg:cyan bold'),
    ('selected', 'fg:green'),
]) if HAS_QUESTIONARY else None

# Paths
SCRIPT_DIR = Path(__file__).parent.resolve()
TEMPLATE_DIR = SCRIPT_DIR / "template"
PROJECTS_DIR = SCRIPT_DIR / ".projects"

# Backend options (renamed from CLI to match our terminology)
BACKEND_CHOICES = [
    {"name": "Claude (Anthropic)", "value": "claude"},
    {"name": "Gemini (Google)", "value": "gemini"},
    {"name": "Codex (OpenAI)", "value": "codex"},
    {"name": "Z.AI (GLM proxy for Claude)", "value": "zai"},
]

AUTH_CHOICES = {
    "claude": [
        {"name": "Anthropic OAuth (use host ~/.claude)", "value": "anthropic-oauth"},
        {"name": "Anthropic API Key", "value": "anthropic-api"},
    ],
    "gemini": [
        {"name": "Gemini OAuth (use host ~/.gemini)", "value": "gemini-oauth"},
        {"name": "Gemini API Key", "value": "gemini-api"},
    ],
    "codex": [
        {"name": "OpenAI OAuth (use host ~/.codex)", "value": "openai-oauth"},
        {"name": "OpenAI API Key", "value": "openai-api"},
    ],
    "opencode": [
        {"name": "OpenCode OAuth (use host credentials)", "value": "opencode-oauth"},
        {"name": "OpenCode API Key", "value": "opencode-api"},
    ],
    "zai": [
        {"name": "GLM (z.ai proxy)", "value": "glm"},
    ],
}



def print_banner():
    """Print the configuration wizard banner."""
    print()
    print("\033[36m╔═══════════════════════════════════════════════════════════════╗\033[0m")
    print("\033[36m║\033[0m  \033[1m\033[35mRALPH WIGGUM DOCKER LOOP\033[0m                                  \033[36m║\033[0m")
    print("\033[36m║\033[0m  \033[2mProject Bootstrap\033[0m                                           \033[36m║\033[0m")
    print("\033[36m╚═══════════════════════════════════════════════════════════════╝\033[0m")
    print()


def ask_select(question: str, choices: list, default: str = None) -> str:
    """Ask a selection question."""
    if HAS_QUESTIONARY:
        result = questionary.select(
            question,
            choices=[c["name"] if isinstance(c, dict) else c for c in choices],
            default=default,
            style=custom_style,
        ).ask()
        if result is None:
            sys.exit(1)
        return result
    else:
        print(f"\n{question}")
        for i, c in enumerate(choices, 1):
            name = c["name"] if isinstance(c, dict) else c
            print(f"  {i}. {name}")
        while True:
            try:
                choice = input("Enter number: ").strip()
                idx = int(choice) - 1
                if 0 <= idx < len(choices):
                    c = choices[idx]
                    return c["name"] if isinstance(c, dict) else c
            except (ValueError, IndexError):
                pass
            print("Invalid choice, try again.")


def ask_text(question: str, default: str = "") -> str:
    """Ask a text input question."""
    if HAS_QUESTIONARY:
        result = questionary.text(question, default=default, style=custom_style).ask()
        if result is None:
            sys.exit(1)
        return result
    else:
        result = input(f"{question} [{default}]: ").strip()
        return result if result else default


def ask_password(question: str) -> str:
    """Ask for a password/secret."""
    if HAS_QUESTIONARY:
        result = questionary.password(question, style=custom_style).ask()
        if result is None:
            sys.exit(1)
        return result
    else:
        import getpass
        return getpass.getpass(f"{question}: ")


def ask_confirm(question: str, default: bool = True) -> bool:
    """Ask a yes/no question."""
    if HAS_QUESTIONARY:
        result = questionary.confirm(question, default=default, style=custom_style).ask()
        if result is None:
            sys.exit(1)
        return result
    else:
        default_str = "Y/n" if default else "y/N"
        result = input(f"{question} [{default_str}]: ").strip().lower()
        if not result:
            return default
        return result in ("y", "yes")


def get_backend_value(selection: str) -> str:
    """Convert selection name back to backend value."""
    for choice in BACKEND_CHOICES:
        if choice["name"] == selection:
            return choice["value"]
    return selection


def get_auth_value(selection: str, backend: str) -> str:
    """Convert selection name back to auth value."""
    choices = AUTH_CHOICES.get(backend, [])
    for choice in choices:
        if choice["name"] == selection:
            return choice["value"]
    return selection


def slugify(name: str) -> str:
    """Convert project name to safe directory name."""
    return name.lower().replace(" ", "-").replace("_", "-")


def copy_template(project_dir: Path):
    """Copy template files to project directory."""
    if not TEMPLATE_DIR.exists():
        print(f"\033[31mERROR: Template directory not found: {TEMPLATE_DIR}\033[0m")
        sys.exit(1)

    # Copy all template files
    for item in TEMPLATE_DIR.iterdir():
        dest = project_dir / item.name
        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)

    # Create CLAUDE.md symlink pointing to AGENTS.md (for Claude Code compatibility)
    agents_md = project_dir / "AGENTS.md"
    claude_md = project_dir / "CLAUDE.md"
    if agents_md.exists() and not claude_md.exists():
        try:
            claude_md.symlink_to("AGENTS.md")
        except OSError:
            # Fallback to copy if symlinks not supported (e.g., Windows without dev mode)
            shutil.copy2(agents_md, claude_md)


def list_projects():
    """List existing projects."""
    if not PROJECTS_DIR.exists():
        return []

    projects = []
    for item in PROJECTS_DIR.iterdir():
        if item.is_dir() and (item / "config.json").exists():
            projects.append(item.name)
    return projects


def main():
    print_banner()

    # List existing projects
    existing = list_projects()
    if existing:
        print(f"\033[2mExisting projects: {', '.join(existing)}\033[0m")
        print()

    # Ask for project name
    project_name = ask_text(
        "Project name",
        default="my-project"
    )
    project_slug = slugify(project_name)
    project_dir = PROJECTS_DIR / project_slug

    # Check if project exists
    if project_dir.exists():
        if not ask_confirm(f"Project '{project_slug}' exists. Reconfigure?"):
            print("\033[33mCancelled.\033[0m")
            return 1
        # Load existing config
        config_file = project_dir / "config.json"
        try:
            with open(config_file) as f:
                existing_config = json.load(f)
        except Exception:
            existing_config = {}
    else:
        existing_config = {}
        # Create project directory and copy template
        print(f"\033[2mCreating project: {project_slug}\033[0m")
        project_dir.mkdir(parents=True, exist_ok=True)
        copy_template(project_dir)
        print(f"\033[32m✓ Template files copied\033[0m")

    # Create subdirectories
    (project_dir / "logs").mkdir(exist_ok=True)

    # Get existing config sections
    existing_prompts = existing_config.get("prompts", {})
    existing_builder = existing_config.get("builder", {})
    existing_reviewer = existing_config.get("reviewer", {})
    existing_architect = existing_config.get("architect", {})
    existing_escalation = existing_config.get("escalation", {})

    # ═══════════════════════════════════════════════════════════
    # BUILDER CONFIGURATION (does the work)
    # ═══════════════════════════════════════════════════════════
    print("\n\033[1m\033[36m📦 BUILDER\033[0m \033[2m(does the work)\033[0m")
    print("\033[2m" + "─" * 50 + "\033[0m")

    backend_selection = ask_select(
        "Builder backend:",
        BACKEND_CHOICES,
        default=existing_builder.get("backend", "claude"),
    )
    builder_backend = get_backend_value(backend_selection)

    # Get auth choices for this backend
    backend_auth_choices = AUTH_CHOICES.get(builder_backend, AUTH_CHOICES["claude"])

    # Get existing auth mode
    existing_auth = existing_builder.get("auth_mode", "")
    default_auth = existing_auth if existing_auth else backend_auth_choices[0]["value"]

    auth_selection = ask_select(
        "Builder auth mode:",
        backend_auth_choices,
        default=default_auth,
    )
    builder_auth_mode = get_auth_value(auth_selection, builder_backend)

    # Builder model (optional)
    builder_model = ask_text(
        "Builder model (leave empty for default)",
        default=existing_builder.get("model", "") or ""
    )

    # API key if needed (any mode ending in -api)
    builder_api_key = ""
    builder_api_base_url = ""
    if builder_auth_mode.endswith("-api"):
        builder_api_key = ask_password("Enter your API key")

    # GLM mode needs base URL
    if builder_auth_mode == "glm":
        builder_api_base_url = ask_text(
            "GLM API base URL",
            default=existing_builder.get("api_base_url", "https://api.z.ai/api/anthropic")
        )

    # ═══════════════════════════════════════════════════════════
    # REVIEWER CONFIGURATION (pass/fail gate)
    # ═══════════════════════════════════════════════════════════
    print("\n\033[1m\033[33m🔍 REVIEWER\033[0m \033[2m(pass/fail gate)\033[0m")
    print("\033[2m" + "─" * 50 + "\033[0m")

    reviewer_enabled = ask_confirm(
        "Enable reviewer? (evaluates builder's work each iteration)",
        default=existing_reviewer.get("enabled", False)
    )

    reviewer_backend = "claude"
    reviewer_auth_mode = "anthropic-oauth"
    reviewer_model = None
    reviewer_session_mode = "fresh"

    if reviewer_enabled:
        # Reviewer backend choices include "(same as builder)" option
        reviewer_backend_choices = [
            {"name": "(same as builder)", "value": "(same)"},
        ] + BACKEND_CHOICES

        reviewer_backend_selection = ask_select(
            "Reviewer backend:",
            reviewer_backend_choices,
            default=existing_reviewer.get("backend") or "(same as builder)",
        )
        reviewer_backend = get_backend_value(reviewer_backend_selection)
        if reviewer_backend == "(same)" or reviewer_backend == "(same as builder)":
            reviewer_backend = builder_backend

        # Get auth choices for reviewer backend
        reviewer_auth_choices = AUTH_CHOICES.get(reviewer_backend, AUTH_CHOICES["claude"])
        reviewer_auth_selection = ask_select(
            "Reviewer auth mode:",
            reviewer_auth_choices,
            default=existing_reviewer.get("auth_mode", reviewer_auth_choices[0]["value"]),
        )
        reviewer_auth_mode = get_auth_value(reviewer_auth_selection, reviewer_backend)

        reviewer_model = ask_text(
            "Reviewer model (leave empty for default)",
            default=existing_reviewer.get("model", "") or ""
        )

    # ═══════════════════════════════════════════════════════════
    # ARCHITECT CONFIGURATION (final approval, big-picture)
    # ═══════════════════════════════════════════════════════════
    architect_enabled = False
    architect_backend = "gemini"
    architect_auth_mode = "gemini-oauth"
    architect_model = None
    architect_session_mode = "resume"

    if reviewer_enabled:
        print("\n\033[1m\033[35m🏛️  ARCHITECT\033[0m \033[2m(final approval, big-picture)\033[0m")
        print("\033[2m" + "─" * 50 + "\033[0m")

        architect_enabled = ask_confirm(
            "Enable architect? (third model with full context for final review)",
            default=existing_architect.get("enabled", False)
        )

        if architect_enabled:
            # Architect backend - Gemini first (1M context advantage)
            architect_backend_choices = [
                {"name": "Gemini (Google) - recommended for 1M context", "value": "gemini"},
                {"name": "Claude (Anthropic)", "value": "claude"},
                {"name": "Codex (OpenAI)", "value": "codex"},
            ]

            architect_backend_selection = ask_select(
                "Architect backend:",
                architect_backend_choices,
                default=existing_architect.get("backend", "gemini"),
            )
            architect_backend = get_backend_value(architect_backend_selection)

            # Get auth choices for architect backend
            architect_auth_choices = AUTH_CHOICES.get(architect_backend, AUTH_CHOICES["gemini"])
            architect_auth_selection = ask_select(
                "Architect auth mode:",
                architect_auth_choices,
                default=existing_architect.get("auth_mode", architect_auth_choices[0]["value"]),
            )
            architect_auth_mode = get_auth_value(architect_auth_selection, architect_backend)

            architect_model = ask_text(
                "Architect model (leave empty for default)",
                default=existing_architect.get("model", "") or ""
            )

            print("\033[2m  Note: Architect uses session_mode=resume for full context across iterations\033[0m")

    # ═══════════════════════════════════════════════════════════
    # ESCALATION CONFIGURATION (role promotion on failures)
    # ═══════════════════════════════════════════════════════════
    escalation_enabled = False
    escalation_max_failures = 3

    if reviewer_enabled:
        print("\n\033[1m\033[31m⬆️  ESCALATION\033[0m \033[2m(role promotion on failures)\033[0m")
        print("\033[2m" + "─" * 50 + "\033[0m")

        escalation_enabled = ask_confirm(
            "Enable escalation? (promote roles if builder fails repeatedly)",
            default=existing_escalation.get("enabled", False)
        )

        if escalation_enabled:
            max_failures_str = ask_text(
                "Max builder failures before escalation",
                default=str(existing_escalation.get("max_builder_failures", 3))
            )
            try:
                escalation_max_failures = int(max_failures_str)
            except ValueError:
                escalation_max_failures = 3

            print("\033[2m  When builder fails " + str(escalation_max_failures) + "x: Reviewer→Builder, Architect→Reviewer\033[0m")

    # ═══════════════════════════════════════════════════════════
    # LOOP SETTINGS
    # ═══════════════════════════════════════════════════════════
    print("\n\033[1m\033[32m⚙️  LOOP SETTINGS\033[0m")
    print("\033[2m" + "─" * 50 + "\033[0m")

    max_iterations_str = ask_text(
        "Max iterations per run (0 = infinite)",
        default=str(existing_config.get("max_iterations", 0))
    )
    try:
        max_iterations = int(max_iterations_str)
    except ValueError:
        max_iterations = 0

    completion_enabled = ask_confirm(
        "Enable completion detection? (builder signals via .project/state/completion.txt)",
        default=existing_config.get("completion_enabled", True)
    )

    # Build config with 3-tier schema
    config = {
        "name": project_name,
        "description": existing_config.get("description", ""),
        "version": existing_config.get("version", "0.1.0"),
        "prompts": {
            "dir": existing_prompts.get("dir", ".project/prompts"),
            "goal": existing_prompts.get("goal", "GOAL.md"),
            "builder": existing_prompts.get("builder", "BUILDER.md"),
            "reviewer": existing_prompts.get("reviewer", "REVIEWER.md"),
            "architect": existing_prompts.get("architect", "ARCHITECT.md"),
        },
        "builder": {
            "backend": builder_backend,
            "auth_mode": builder_auth_mode,
            "model": builder_model or None,
            "session_mode": "fresh",
        },
        "reviewer": {
            "enabled": reviewer_enabled,
            "backend": reviewer_backend,
            "auth_mode": reviewer_auth_mode,
            "model": reviewer_model or None,
            "session_mode": "fresh",
        },
        "architect": {
            "enabled": architect_enabled,
            "backend": architect_backend,
            "auth_mode": architect_auth_mode,
            "model": architect_model or None,
            "session_mode": "resume",
        },
        "escalation": {
            "enabled": escalation_enabled,
            "max_builder_failures": escalation_max_failures,
        },
        "max_iterations": max_iterations,
        "completion_enabled": completion_enabled,
        "knowledge_dir": ".project",
    }

    # Add API key/URL to builder section if needed
    if builder_api_key:
        config["builder"]["api_key"] = builder_api_key
    if builder_api_base_url:
        config["builder"]["api_base_url"] = builder_api_base_url

    # ═══════════════════════════════════════════════════════════
    # CONFIGURATION SUMMARY
    # ═══════════════════════════════════════════════════════════
    print()
    print("\033[1m" + "═" * 55 + "\033[0m")
    print("\033[1m  CONFIGURATION SUMMARY\033[0m")
    print("\033[1m" + "═" * 55 + "\033[0m")
    print(f"  Project: \033[32m{project_slug}\033[0m")
    print()

    # Builder summary
    print("  \033[36m📦 BUILDER:\033[0m")
    print(f"     Backend:    \033[32m{builder_backend}\033[0m")
    print(f"     Auth:       \033[32m{builder_auth_mode}\033[0m")
    if builder_model:
        print(f"     Model:      \033[32m{builder_model}\033[0m")
    if builder_api_base_url:
        print(f"     API URL:    \033[32m{builder_api_base_url}\033[0m")
    print()

    # Reviewer summary
    print("  \033[33m🔍 REVIEWER:\033[0m")
    if reviewer_enabled:
        print(f"     Enabled:    \033[32mYes\033[0m")
        print(f"     Backend:    \033[32m{reviewer_backend}\033[0m")
        print(f"     Auth:       \033[32m{reviewer_auth_mode}\033[0m")
        if reviewer_model:
            print(f"     Model:      \033[32m{reviewer_model}\033[0m")
    else:
        print(f"     Enabled:    \033[33mNo\033[0m")
    print()

    # Architect summary
    print("  \033[35m🏛️  ARCHITECT:\033[0m")
    if architect_enabled:
        print(f"     Enabled:    \033[32mYes\033[0m")
        print(f"     Backend:    \033[32m{architect_backend}\033[0m")
        print(f"     Auth:       \033[32m{architect_auth_mode}\033[0m")
        if architect_model:
            print(f"     Model:      \033[32m{architect_model}\033[0m")
        print(f"     Session:    \033[32mresume (full context)\033[0m")
    else:
        print(f"     Enabled:    \033[33mNo\033[0m")
    print()

    # Escalation summary
    print("  \033[31m⬆️  ESCALATION:\033[0m")
    if escalation_enabled:
        print(f"     Enabled:    \033[32mYes\033[0m")
        print(f"     Threshold:  \033[32m{escalation_max_failures} failures\033[0m")
    else:
        print(f"     Enabled:    \033[33mNo\033[0m")
    print()

    # Loop settings summary
    print("  \033[32m⚙️  LOOP:\033[0m")
    print(f"     Max Iter:   \033[32m{max_iterations if max_iterations else 'infinite'}\033[0m")
    print(f"     Completion: \033[32m{'Enabled' if completion_enabled else 'Disabled'}\033[0m")
    print()
    print("\033[1m" + "═" * 55 + "\033[0m")

    # Confirm
    if not ask_confirm("Save this configuration?"):
        print("\033[33mConfiguration cancelled.\033[0m")
        return 1

    # Save config
    config_file = project_dir / "config.json"
    with open(config_file, "w") as f:
        json.dump(config, f, indent=2)

    print()
    print(f"\033[32m✓ Project configured: {project_slug}\033[0m")
    print(f"\033[2m  Location: {project_dir}\033[0m")
    print()
    print("\033[2mNext steps:\033[0m")
    print(f"  1. Edit {project_dir / 'GOAL.md'} with your project objective and completion criteria")
    print(f"  2. Run: ./scripts/run.sh {project_slug}")
    print(f"     Or:  .\\scripts\\run.ps1 -Project {project_slug}")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
