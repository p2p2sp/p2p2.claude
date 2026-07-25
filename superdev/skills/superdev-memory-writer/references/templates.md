# Memory Layer Templates

## Root Context Template

Add to CLAUDE.md at project root:

```markdown
## Memory Layer

**Before modifying code in a subdirectory, read its CLAUDE.md first** to understand local patterns and invariants.

- **[Area 1]**: `path/to/CLAUDE.md` - Brief description
- **[Area 2]**: `path/to/CLAUDE.md` - Brief description

### Global Invariants

- [Invariant that applies across all areas]
- [Another global invariant]

### Commands

<!-- Repo-wide commands ONLY if the whole project shares one toolchain. In a
     polyglot/monorepo omit here and put commands in each subproject's node.
     Discover from the host project's config (e.g. package.json, Makefile, a CI
     workflow) - never hardcode. -->
- Build / Test / Lint / Run: `<discovered ...>`
```

## Child Node Template

Each CLAUDE.md in subdirectories:

```markdown
# {Area Name}

## Purpose
[1-2 sentences: what this area owns, what it explicitly doesn't do]

## Entry Points
- `main_api.ts` - Primary API surface
- `cli.ts` - CLI commands

## Commands

<!-- ONLY if this subtree has its own toolchain. Discover from the host project's
     config (e.g. package.json scripts, Makefile/justfile, pyproject.toml,
     composer.json, a CI workflow) - never invent. Omit the section when commands
     are inherited from an ancestor node. -->
- Build: `<discovered build command>`
- Test: `<discovered test command>`
- Lint: `<discovered lint/format command>`
- Run: `<discovered dev/run command>`

## Contracts & Invariants
- All DB calls go through `./db/client.ts`
- Never import from `./internal/` outside this directory

## Patterns
To add a new endpoint:
1. Create handler in `./handlers/`
2. Register in `./routes.ts`
3. Add types to `./types.ts`

## Anti-patterns
- Never call external APIs directly; use `./clients/`
- Don't bypass validation layer

## Related Context
- Database layer: `./db/CLAUDE.md`
- Shared utilities: `../shared/CLAUDE.md`
```

## Measurements Table Format

```
| Directory        | Tokens | Threshold | Needs Node? |
|------------------|--------|-----------|-------------|
| src/components   | ~30k   | 20-64k    | YES (2-3k)  |
| src/pages        | ~22k   | 20-64k    | YES (2-3k)  |
| src/lib          | ~8k    | <20k      | NO          |
```

Thresholds:
- <20k tokens → No node needed
- 20-64k tokens → 2-3k token node
- >64k tokens → Split into child nodes
