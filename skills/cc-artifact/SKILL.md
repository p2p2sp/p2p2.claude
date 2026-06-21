---
name: cc-artifact
description: Publish ONE already-written shareable file (a self-contained `.html` / `.htm` / `.md`) as a Claude Code Artifact — a private, shareable page on claude.ai — when the user wants to share, present, or hand off a rendered output (an HTML preview, a plan, a report) as a live link instead of a local file. Triggers - "publish this as an artifact", "make an artifact", "share this preview/page as a link", "turn this HTML/markdown into a shareable page", "give me a link to share", or arriving here from ui-web-preview (a generated preview HTML) or from a passed plan markdown. Opt-in and main-session only - asks before publishing, validates the file is single-file / size-bounded / free of external references first, and falls back to reporting the local path when artifacts are unavailable, disabled, or the user declines (fail-open). Owns title + emoji and update-in-place (republish to the same URL). Does NOT generate the file (that is the upstream producer, e.g. ui-web-preview) and is never invoked from a fork or as part of the 3-line orchestrator pipeline.
---

# Artifact Publisher

Turn ONE already-written, self-contained file into a **Claude Code Artifact** — a private,
shareable page on `claude.ai` reachable by URL — so the user can present or hand off a rendered
output as a live link instead of a `file://` path. This is a **thin publisher**: it does not
author content. The upstream producer (e.g. `ui-web-preview` for an HTML preview, or a plan author
for a plan markdown) writes the file; this skill validates it, asks, and publishes — or falls back
to the local path.

## Operating principles

- **Opt-in, never silent.** Publishing sends content to `claude.ai`. Always state what will be
  published and **ask the user to confirm before the first publish**. No confirmation → report the
  local path and stop.
- **Fail-open, always.** If the native Artifact capability is unavailable (headless / CI / Agent SDK
  / MCP context / `disableArtifact` / a non-Anthropic provider / API-key auth / an org policy that
  forbids it), or the user declines, **do not error** — report the local file path the user can open
  with `file://` and move on. Inability to publish is never a failure of this skill.
- **Validate before you publish.** A shareable artifact must be **one self-contained file** with
  **no external references** that would leak requests off the page or fail to render for a viewer.
  Run the checks below before invoking the native capability; surface a gap, do not silently publish
  a broken page.
- **Render only what exists.** Publish the file as written. Do not edit, embellish, or "fix up" the
  content to make it publishable — if it fails a check, report the specific problem and let the
  upstream producer (or the user) fix the source.
- **Main session only.** This skill uses the native Artifact capability, which prompts the user for
  permission and lives in the interactive main session. It is **never** invoked from a fork and is
  **never** part of the 3-line `STATUS / Report / Summary` orchestrator pipeline — a fork cannot
  approve the permission prompt, and an artifact URL is not a pipeline verdict.

## Inputs

Two inputs, resolved from the request or the upstream chain:

| Input | What it is |
|-------|-----------|
| **File** | An absolute path to ONE already-written file — extension `.html`, `.htm`, or `.md`. This is the page to publish. The skill does not create it. |
| **Title** | A short human title for the page (the share label). If the user did not give one, propose one from the file's `<title>` / first `#` heading / filename and confirm it. |

If the request names no file, or names more than one, or the file does not exist on disk, stop and
ask — a publisher with nothing concrete to publish has no fallback to fall back to.

## Validation — the CSP-conformant single-file check

Before publishing, `Read` the file and confirm all three. Any failure → report the specific problem
and stop (do not publish a broken or leaky page); the user/upstream fixes the source, then re-runs.

1. **Single file.** The content is wholly contained in this one file — markup/styles/scripts inline,
   no `<link rel="stylesheet" href="…local…">`, no `<script src="…local…">`, no `<img src>` /
   `url(...)` pointing at a sibling file on disk. A viewer on `claude.ai` has only this file; a
   relative reference to a neighbour will 404.
2. **No external references / no off-page network.** No `http://` / `https://` / protocol-relative
   `//host/…` URL in any `href`, `src`, `url(...)`, `@import`, or `fetch`/XHR target — those leak a
   request off the page and may be blocked. **Allowed and NOT a violation:** `data:` URIs (inline,
   self-contained), bare in-page `#anchor` fragments, and `mailto:` links — none of these issue an
   off-page resource request, so they must not be refused.
3. **Size-bounded.** The file is small enough to be a single shareable page, not a multi-megabyte
   dump. If it is implausibly large (well beyond a normal preview/report), surface it and confirm
   before publishing rather than shipping a page that will not load.

A web preview produced by `ui-web-preview`'s standalone single-file emit is built to pass all three
by construction; an arbitrary HTML file the user hands over might not — that is exactly why the
check runs every time.

## Publish

When the file passes validation and the user has confirmed:

1. **Publish via the native Artifact capability**, passing the validated file path and the confirmed
   title. The harness prompts the user for permission on the **first** publish of a given artifact
   ("publish `<title>` to a private page on claude.ai"); on approval the page is published and a URL
   is returned. Subsequent republishes of the same artifact do not re-prompt.
2. **Owns title + emoji.** Set the page title to the confirmed Title and prefix a single,
   intent-appropriate emoji (a preview/page vs. a plan vs. a report read differently) — a small,
   consistent affordance so a shared link is recognizable. Keep it to one emoji; do not decorate.
3. **Report the URL** back to the user in plain prose: the title, the live URL, and a one-line note
   that it is private/shareable. Do not bury it.

### Update in place (republish)

To revise an already-published artifact, **republish to the same URL** — do not create a second
artifact. Re-run the validation on the revised file, then publish again referencing the same
artifact (in a later session, the user supplies the existing artifact URL so the harness updates in
place rather than minting a new one). Each republish is a new version at the same link; viewers see
the latest. State "updated in place" rather than handing back a new URL.

## Fallback — report the local path

If publishing is unavailable or refused at any point — the capability is disabled/absent in this
environment, the permission prompt is denied, or the user declines to publish — **do not error**:

- Report the **absolute local path** of the file and that it opens directly with `file://`.
- State plainly that it was not published (and, if known, the reason: artifacts unavailable in this
  environment, or declined).
- Offer the republish path for later (re-run this skill in an interactive session where artifacts
  are enabled).

This is the fail-open contract: the user always leaves with *something they can open*, whether or
not the artifact landed.

## Anti-patterns (forbidden)

- **Publishing without asking.** Sending content off-machine silently. Always confirm before the
  first publish.
- **Erroring when artifacts are unavailable.** The contract is fail-open — degrade to the local
  path, never throw.
- **Refusing a `data:` URI, a `#anchor`, or a `mailto:` link** as an "external reference" — none
  issue an off-page request; only real off-page URLs (`http(s)://`, `//host/…`) and local
  multi-file references fail the check.
- **Authoring or editing the content** to make it publishable. This skill publishes; it does not
  produce. A failing file is fixed at the source by the upstream producer or the user.
- **Generating a fresh page** instead of republishing to the same URL on an update — that orphans
  the old link and breaks update-in-place.
- **Running from a fork or emitting a 3-line `STATUS / Report / Summary`.** This is a main-session,
  interactive, opt-in publisher — not a pipeline executor. A fork cannot approve the permission
  prompt; an artifact URL is not an orchestrator verdict.
- **Publishing more than one file in a call.** One artifact = one self-contained file. Multiple
  files → ask the user which single file to publish (or have the upstream producer emit a single
  self-contained file first).

## Related skills

- **ui-web-preview** — generates the self-contained web preview HTML this skill publishes; its
  standalone single-file emit is built to pass the validation above. The natural chain is
  `ui-web-preview → cc-artifact` (preview the design system, then share it as a live link).
- A passed plan markdown (e.g. after `dev-plan-reviewer` returns `PASS`) is the other natural source:
  `dev-plan-reviewer PASS → cc-artifact` (publish the approved plan as a shareable page).
