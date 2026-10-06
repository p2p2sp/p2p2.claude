const TASK_AGENTS = ["viber:task-coder", "viber:task-reviewer"];
const TASK_LINE = /^task:[ \t]*\S*[\\/]tasks[\\/]([^\\/\s]+)\.md[ \t\r]*$/m;
const RUN_SCRIPT = /(?:plan-path|plan-index|commit-task|archive-run)\.sh/;

export function dispatchedTaskId(subagentType: string | undefined, prompt: string | undefined): string | null {
  if (subagentType === undefined || !TASK_AGENTS.includes(subagentType)) return null;
  if (prompt === undefined) return null;
  return TASK_LINE.exec(prompt)?.[1] ?? null;
}

export function isRunScriptCall(command: string): boolean {
  return RUN_SCRIPT.test(command);
}
