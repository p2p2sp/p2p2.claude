`claude plugin validate` refuses `$` passed to a function that is not declared at the top of the file, so `refresh` and its state (`run`, `seq`, `running`, `stopClock`) are module-level, not inside `register`.
The state sits in module variables, not `$.state` atoms: atoms need a `types` field in plugin.json, which must not change. A reload resets them, so a dispatch seen before it stops showing as running.
Both `tool.call` hooks carry `.catch((_$, e, next) => next(e))` so a throw never blocks or alters a call; without it validate warns "gating hook without .catch".
`running` is never pruned: `panelOf` ranks done/skipped above running, so a settled id never shows as running.
The band hook yields only for no run (not `hasSurvey`), as DoD.3 states.
