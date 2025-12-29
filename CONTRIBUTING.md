# Contributing to VibeMerge

## Branch Strategy

| Branch | Remote | Description |
|--------|--------|-------------|
| `main` | origin (private) | Full codebase including private taskfiles |
| `public` | origin-public | Public version without taskfiles |

## Workflow

### Daily Development

```bash
# Work on main branch
git checkout main

# Make your changes...
git add .
git commit -m "feat: your feature"

# Push to private remote
git push origin main
```

### Sync to Public Repo

```bash
# Switch to public branch
git checkout public

# Merge changes from main
git merge main

# Push to public remote (public branch -> main on origin-public)
git push origin-public public:main

# Return to main
git checkout main
```

### Release a New Version

```bash
# 1. Update version in package.json
# 2. Commit changes
git add .
git commit -m "chore: bump version to x.x.x"

# 3. Create tag
git tag vX.X.X

# 4. Push to private
git push origin main --tags

# 5. Sync to public
git checkout public
git merge main
git push origin-public public:main --tags
git checkout main

# 6. Package and publish
bun run compile
bunx @vscode/vsce package --allow-missing-repository
# Upload .vsix to marketplace
```

## Remotes

| Remote | URL | Visibility |
|--------|-----|------------|
| `origin` | (your private repo) | Private |
| `origin-public` | https://github.com/ddiawara/vibe-merge | Public |

## Files Excluded from Public

- `taskfiles/` - Private automation scripts
- `Taskfile.yml` - Task runner config
- `CONTRIBUTING.md` - This file (private workflow docs)
- `CLAUDE.md` - Claude Code instructions
- `.copier-answers.yml` - Copier template answers
- `.flox/` - Flox environment config
- `.claude/` - Claude Code settings
- `.vscode/` - VS Code workspace settings
- `prompts/` - AI prompts templates
- `scripts/` - Private utility scripts
