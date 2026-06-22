# Authentication and scopes

## Preconditions — every gh-using skill should fail fast

Run these checks before any other `gh` call. Non-zero exit code on either ⇒ stop and tell the user.

```bash
gh --version          # CLI installed?
gh auth status        # authenticated to the host you'll call?
```

If `gh --version` fails: point the user to <https://cli.github.com/>.

If `gh auth status` fails: instruct `gh auth login` (interactive — must be run by the user; an agent cannot complete the browser flow).

## Interactive auth

```bash
gh auth login                                  # interactive picker (host, protocol, token method)
gh auth login --hostname github.com --web      # browser-based OAuth flow
gh auth login --hostname github.com --with-token < token.txt
```

## Adding scopes to an existing login

When a feature needs a scope that wasn't requested at first login, add it without re-logging-in:

```bash
gh auth refresh -h github.com -s project,read:org
gh auth refresh -h github.com -s admin:org
```

After `refresh`, re-run `gh auth status` to confirm the new scopes appear.

## Required scopes per feature

| Feature | Token scope (classic PAT) | Fine-grained token permission |
|---|---|---|
| Read repos (default `repo:status`, `public_repo`) | `repo` | `Contents: Read` |
| Write to issues / PRs (default) | `repo` | `Issues: Write`, `Pull requests: Write` |
| **Projects v2** (read or write) | `project` (or `read:project`) | `Organization projects: Write` |
| **Issue type definitions** at org level | `admin:org` | `Organization administration: Write` |
| **Discussions** (read/write) | `repo` (incl. private) | `Discussions: Write` |
| **Workflows** dispatch / cancel | `workflow` | `Actions: Write` |
| **Packages** push/delete | `write:packages` / `delete:packages` | `Packages: Write` |
| **GPG/SSH keys** | `admin:public_key`, `admin:gpg_key` | `Keys: Write` |
| `gh ssh-key add` | `admin:public_key` | n/a |

Always check `gh auth status` output: it lists active scopes. If a call returns `403` with `must have admin rights` or `Resource not accessible by personal access token`, the token is missing the scope.

## CI / non-interactive auth

In GitHub Actions, set the env var — do not call `gh auth login`:

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
steps:
  - run: gh issue list -R ${{ github.repository }}
```

For cross-repo writes (default `GITHUB_TOKEN` is scoped to the running repo), use a PAT or a GitHub App token in a separate secret.

Outside Actions but still non-interactive (cron, container):

```bash
echo "$MY_TOKEN" | gh auth login --with-token
# or:
export GH_TOKEN="$MY_TOKEN"   # gh picks this up automatically
```

`GITHUB_TOKEN` and `GH_TOKEN` are both honoured; `GH_TOKEN` wins on conflict. For enterprise hosts: `GH_ENTERPRISE_TOKEN` / `GITHUB_ENTERPRISE_TOKEN`.

## Multiple hosts / accounts

```bash
gh auth login --hostname github.example.com    # add an enterprise host
gh auth switch --hostname github.example.com   # switch active host
gh auth switch --user other-account            # switch users on the same host
gh auth status --hostname github.com           # show status for a specific host
```

`gh` keeps tokens in the OS keyring when available; fall back to a config file otherwise.

## Inspecting the token

```bash
gh auth token                                  # print the active token to stdout
gh api user -q .login                          # confirm which account the token resolves to
gh api -i user | grep -i x-oauth-scopes        # show the scopes the API sees
```

The `X-OAuth-Scopes` response header is the source of truth — it shows what GitHub thinks the token can do, irrespective of what was requested at login.

## Sources

- gh manual — auth: <https://cli.github.com/manual/gh_auth>
- gh manual — auth login: <https://cli.github.com/manual/gh_auth_login>
- gh manual — auth refresh: <https://cli.github.com/manual/gh_auth_refresh>
- OAuth scopes reference: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps>
- Fine-grained token permissions: <https://docs.github.com/en/rest/overview/permissions-required-for-fine-grained-personal-access-tokens>
- Automatic auth in Actions: <https://docs.github.com/en/actions/security-guides/automatic-token-authentication>
