---
name: prove-it
description: Tests a conclusion this conversation reached about the code. Splits it into claims, sends each claim as a blind question to two parallel viber:witness agents on the session's model, then judges their evidence against the conclusion and confirms, corrects, marks unproven or leaves each claim disputed for the user to decide. With no argument it tests the latest conclusion.
argument-hint: "[the conclusion to test; none tests the latest one]"
allowed-tools: Read, Grep, Glob, Agent, Bash
user-invocable: true
disable-model-invocation: true
---

# prove-it

A conclusion in, each of its claims judged on evidence out. You edit no file; your tools are Read, Grep, Glob and Agent.

## 1. Claims

- Source: `$ARGUMENTS`; empty -> the latest conclusion this session stated. No conclusion in either -> say so in one line and stop.
- Split it into claims each checkable on its own: a fact about the code, or a recommendation checked through the fact it rests on. A claim the repository cannot settle (library, runtime or external service behaviour) is listed as out of scope, not dispatched.
- Per claim write one blind question about its subject; for a recommendation, ask what the code shows about the underlying fact. It NEVER carries the session's answer, its reasoning, or a yes/no question built on that answer, because a witness who sees the answer confirms it. Leak: "Does X cause the crash?"; blind: "What causes the crash in Y?".
- Per claim write one `context:` line holding only paths and facts the user gave (`none` when there are none), never a conclusion of this session.

## 2. Budget

More than 3 claims -> list them numbered, state the agent count (2 per claim), ask in prose whether to test all or which numbers, and stop until the user answers.

## 3. Dispatch

Per claim two `Agent` calls, `subagent_type: viber:witness`, no `model:` line, both with the identical prompt of two labelled lines and nothing else: `question: <the blind question>` and `context: <the context line>`. Every call of every claim goes out in one message so they run in parallel.

## 4. Judge

Per claim, count votes:

- `EVIDENCE: none`, `ANSWER: UNRESOLVED`, `VERDICT: DENIED`, or an answer that neither supports nor contradicts the claim is no vote;
- both votes agree with the claim, each with evidence -> `confirmed`;
- one vote only, agreeing -> `unverified (1/2)`; no vote -> `unverified (0/2)`;
- at least one vote contradicts the claim with evidence, including when the witnesses contradict each other -> read its cited lines first (a citation that does not show what the witness says drops that vote), then look in the code for counter-evidence at a `path:line`: none or weaker -> `refuted`; stronger than the contradiction -> `upheld` with that evidence; of equal weight -> `disputed`, the user decides.

Never uphold a claim on your own authority: only a `path:line` you read keeps it standing.

## 5. Output

In the language of the conversation:

- per claim: the claim, its verdict, one line per witness (a `DENIED` one shows its `REASON:` line), the deciding evidence. `confirmed` and `upheld` keep the claim standing; `unverified` marks it unproven and names what was missing.
- then the corrected conclusion when any claim is `refuted`; one line saying the conclusion stands only when every claim is `confirmed` or `upheld`; otherwise one line naming the claims that leave it unproven or open.
- each `disputed` claim as a question to the user.
