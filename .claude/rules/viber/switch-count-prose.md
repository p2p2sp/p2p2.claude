---
paths:
  - "viber/README.md"
  - "viber/skills/setup/assets/help.html"
---

# Update the switch-count sentence with every switch add or remove

- A new (or removed) config switch changes the count named in the "N of M on" summary sentence in
  both `viber/README.md`'s "Optional switches" section and `help.html`'s own summary paragraph in
  BOTH languages - none of these three lines is ever listed in a task's own Delivers/DoD, so they
  go stale silently unless read and fixed by hand. Adding `final-review` (the eighth switch) fixed
  README's line to "six of the eight on and qa and issues off" and `help.html`'s English and
  Polish paragraphs to "Six of the eight..." (T2's own coder notes: "not explicitly named in
  Delivers, but left stale it would contradict the new switch table"); adding `plain-plan-review`
  earlier did the same, "four of the five" to "five of the six".
