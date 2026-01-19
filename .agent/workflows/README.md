# Workflows

This directory contains workflow definitions for the Antigravity agent.

## Creating a new workflow

Create a new markdown file (e.g., `deploy.md`) with the following YAML frontmatter:

```markdown
---
description: A short description of what this workflow does
---

1. Step one
2. Step two
// turbo
3. Step three (auto-run if it's a command)
```

## Annotations

- `// turbo`: Place this above a step to allow the agent to auto-run a command without asking for specific permission (unless it's potentially dangerous).
- `// turbo-all`: Place this anywhere in the file to enable turbo mode for ALL steps in the workflow.
