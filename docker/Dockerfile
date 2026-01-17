# Multi-CLI Dockerfile for Ralph Wiggum Docker Loop
# Supports: Claude, Gemini, Codex (all via OAuth passthrough)
# Loop runs OUTSIDE the AI CLI (external loop pattern)

FROM ubuntu:24.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies + gosu for user switching + tzdata for timezone
RUN apt-get update && apt-get install -y \
    curl \
    git \
    sudo \
    wget \
    unzip \
    build-essential \
    ca-certificates \
    gnupg \
    jq \
    gosu \
    tzdata \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (required for Claude Code CLI and Codex CLI)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install ALL AI CLIs globally
RUN npm install -g @anthropic-ai/claude-code
RUN npm install -g @google/gemini-cli
RUN npm install -g @openai/codex

# Install opencode CLI (uses official installer)
# Installs to ~/.opencode/bin/opencode, we COPY (not symlink) to /usr/local/bin
# so claude user can access it (symlink to /root/ would fail for non-root user)
RUN curl -fsSL https://opencode.ai/install | bash \
    && cp /root/.opencode/bin/opencode /usr/local/bin/opencode \
    && chmod +x /usr/local/bin/opencode \
    || echo "opencode install failed - skipping (optional)"

# Create a non-root user with sudo access
RUN useradd -m -s /bin/bash claude \
    && echo "claude ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Copy the unified ralph loop script, library modules, and parsers
COPY ralph.sh /app/ralph.sh
COPY lib/ /app/lib/
COPY parsers/ /app/parsers/
COPY formatter/ /app/formatter/
RUN chmod +x /app/ralph.sh /app/lib/*.sh

# Install formatter dependencies (chalk for colors)
RUN cd /app/formatter && npm install --production

# Legacy symlink for compatibility
RUN ln -sf /app/ralph.sh /ralph.sh

# Copy CLI configuration files
COPY cli/ /app/cli/
RUN chmod +x /app/cli/*.sh

# Legacy symlink for compatibility
RUN ln -sf /app/cli /cli

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set HOME for CLI tools to find config
ENV HOME=/home/claude

# Settings come from .ralph/config.json (read by entrypoint)
# No defaults here - config provides them

# Set working directory
WORKDIR /project

# Entrypoint runs as root to fix permissions, then switches to claude user
ENTRYPOINT ["/entrypoint.sh"]
