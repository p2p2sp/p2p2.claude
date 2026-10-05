# P2P2 Claude Code Plugins

Four Claude Code plugins we use every day at P2P2, in one marketplace. Each installs on its own
and none depends on another. There is nothing to build and nothing to configure per language:
each plugin picks up your project's conventions from your own `CLAUDE.md` and `.claude/rules/`,
whatever stack you work in.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superui@p2p2 --scope user
claude plugin install superbiz@p2p2 --scope user
claude plugin install supercc@p2p2 --scope user
claude plugin install viber@p2p2 --scope user
```

Install only the ones you want. `--scope user` makes a plugin available in all your projects; drop
it to install for the current repository only. From inside a running session,
`/plugin marketplace add https://github.com/p2p2sp/p2p2.claude` followed by
`/plugin install viber@p2p2` does the same thing.

## The plugins

| Plugin | Use it for |
| --- | --- |
| [viber](viber/README.md) | From an idea to committed code: understand it, plan it, build it, remember it. |
| [superui](superui/README.md) | Any interface you build, held to professional design standards. Fires by itself. |
| [superbiz](superbiz/README.md) | Deciding whether a side-project idea is worth building. |
| [supercc](supercc/README.md) | Writing and fixing your own Claude Code skills and agents. |

## Requirements

| Plugin | Needs |
| --- | --- |
| superbiz | web access and Python 3 |
| superui | Node.js 22.6 or newer, optional: only for the contrast check |
| supercc | nothing |
| viber | the `gh` CLI for its GitHub steps, checked by `/viber:setup`; Node.js 22.6 or newer for `/viber:code-auditor`; optional: `node`, for `/viber:setup`'s settings merge, and Playwright, for `/viber:e2e` |

## Contributing

We build these plugins for our own work at P2P2, and only our team develops them, so we do not
accept pull requests. Found a bug or have an idea?
[Open an issue](https://github.com/p2p2sp/p2p2.claude/issues/new/choose): we read every one.
More in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
