<superui:manifest>

You have `superui` plugin and it defines EXTREMELY IMPORTANT RULES that you must always follow during a session with a user.

## MANDATORY RULES — NON-NEGOTIABLE

Iron, universal, always-on, golden rules.

### Operating
- **Design artifacts** — The framework-agnostic design system and its target adaptations live under `.superui/layout/`.

## These thoughts mean STOP — you're rationalizing

| Thought | Reality |
|---------|---------|
| "This is just a simple style tweak" | UI edits are tasks. Check for skills. |
| "I can just write the CSS/component myself" | The guardian binds edits to documented tokens. Check first. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |

## design-guardian gate

Before any `Edit` / `Write` touching UI in a project whose design system has already been adapted to a target, bind to the documented tokens / components / foundations first — MUST invoke `design-guardian` so the edit is grounded in the documented system, not improvised.

</superui:manifest>