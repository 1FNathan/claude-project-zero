# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

- **Local path:** `Y:/Claude/Project Zero/`
- **GitHub:** https://github.com/1FNathan/claude-project-zero
- **Branch:** `main`

## Git Workflow

After every meaningful change, commit and push:

```bash
git add <files>
git commit -m "type: short description"
git push origin main
```

Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.

The `.claude/` directory is gitignored and should never be committed.
