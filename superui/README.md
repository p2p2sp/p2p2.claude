# superui

Holds every interface Claude builds to professional design standards, so what comes out does not
look generated.

## Why superui

- **It catches the AI look.** Every review starts from a catalog of the tells that make an
  interface look generated, and steers away from each one.
- **It fires on its own.** No command to remember: "add a settings page" is enough.
- **It covers the whole craft.** Visual hierarchy, color, type, 4/8pt spacing, accessibility,
  component states, form validation, purposeful motion, and conversion with hard rules against dark
  patterns.
- **It measures contrast.** Color pairs are checked against WCAG AA for their kind of text, so
  contrast is a number, never a guess.
- **Your design, your call.** It works with the design system you already have and never
  overwrites it. It proposes and critiques; every decision stays yours.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superui@p2p2 --scope user
```

Node.js 22.6 or newer is optional: it powers the contrast checker. Without it that one check is
skipped with a note. Nothing to install with `npm`.

## How to use it

Just work on an interface: a page, a screen, a dashboard, a form, an onboarding flow, a landing
page, a single component. It also fires when you ask for a critique, add animation, or say a UI
looks generic:

```
add a settings page with profile and notification sections
review the checkout form, it feels cluttered
this dashboard looks generic, make it feel designed
```
