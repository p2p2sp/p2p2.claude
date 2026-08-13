# Product doc format

## Template

```markdown
# <Feature name>

<One short paragraph: what the feature does for the user, in plain language.>

## How to use it

- <How the user reaches or triggers the feature - a menu path, a command, a screen.>
- <The next concrete step, in order.>

## Behavior and limits

- <An observable behavior, output, or state the user will see.>
- <A limit, edge case, or thing the user should know before relying on it.>
```

Filename = the capture slug: `docs/product/<feature-slug>.md`.

## Good

Concrete, user-facing, no jargon:

```markdown
# Password reset

If you forget your password, you can set a new one from the sign-in screen
without contacting support.

## How to use it

- On the sign-in screen, select "Forgot password?".
- Enter the email on your account and submit.
- Open the email you receive and follow its link to choose a new password.

## Behavior and limits

- The reset link stays valid for 30 minutes; after that, request a new one.
- Only the most recent reset link is valid - requesting a new one cancels older links.
```

## Bad - never write these

- Implementation detail: "calls `resetPassword()` in `auth/service.ts`" - the user never sees a symbol or a path.
- Spec or plan copy: restating the What & Why of the change instead of distilling the feature's current behavior.
- Marketing tone: "our powerful, seamless password recovery experience" - state what happens, not how good it is.
- Vague hand-waving: "the system handles resets appropriately" - name the actual steps and the actual limit.
- Missing limits: omitting expiry, quotas, or edge states the user will hit and wonder about.
