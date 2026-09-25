# T21 coder notes

- Added the same exception sentence in three places: `templates/viber.yml`'s header comment,
  `bootstrap.sh`'s header comment above `merge_config()`, and both `lang="en"`/`lang="pl"`
  paragraphs in `usage.html`'s switches section - a deleted `tiers:`/`branching:` child is not
  restored (the merge only appends one of those groups whole when absent, never extends an
  existing one) and resolves to its default in `config.sh` instead, unlike a top-level key or a
  `directories:` child.
- Reused the exact phrasing bootstrap.sh already had ("resolves to its default in config.sh")
  for consistency rather than inventing new wording.
- No code path changed: `bootstrap.sh`'s awk logic already behaves this way (only `directories`
  gets the child-insertion branch); this task is comment/doc-only.
