# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

- **Local path:** `C:/Users/NathanHarris/projects/process-flow/`
- **GitHub:** https://github.com/1FNathan/claude-project-zero
- **Branch:** `main`

## Git Workflow

**Commit and push after every meaningful unit of work** — completing a feature, fixing a bug, adding a file, or reaching any stable checkpoint. Never leave significant work uncommitted. The goal is that GitHub always reflects the current state of the project so nothing is ever lost.

```bash
git add <files>
git commit -m "type: short description"
git push origin main
```

Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.

The `.claude/` directory is gitignored and should never be committed.
