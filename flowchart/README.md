# Ralph Wiggum Docker Loop - Interactive Flowchart

An interactive step-by-step visualization of how the Ralph Wiggum Docker Loop works.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Features

- **Step-by-step reveal**: Click "Next" to progressively reveal each step
- **Code snippets**: See relevant configuration/code examples at each step
- **Interactive canvas**: Pan, zoom, and drag nodes
- **Star Wars theme**: Matches the project's aesthetic

## Deployment

### GitHub Pages

1. Build the project:
   ```bash
   npm run build
   ```

2. The `dist/` folder can be deployed to GitHub Pages or any static host

### Embedding in README

You can link to the hosted version in your README:

```markdown
[View Interactive Diagram](https://your-username.github.io/ralph-wiggum-docker-loop/)
```

## Technology

- React 19
- XYFlow (React Flow) for the interactive diagram
- Vite for building
- TypeScript
