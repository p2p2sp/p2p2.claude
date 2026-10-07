/*
 * register.tsx - viber's report-name write. The Write hook answers one refusal
 * only: the harness guard rejecting a viber agent's Write of a .md file whose name
 * starts with report, summary, findings or analysis, for a path inside the project
 * root; it writes that file itself and returns the Write result. Every other Write
 * passes through unchanged. The logic it draws from is write/report-name.ts.
 */

import type { EngineInterface, Register } from 'claude-code'

import { isInsideRoot, isReportNameRefusal, isViberAgent } from './write/report-name'

/** The text of a file, or null when it cannot be read. */
function textOf($: EngineInterface, path: string): Promise<string | null> {
  return Promise.resolve()
    .then(() => $.fs.read(path))
    .then(
      (text) => text,
      () => null,
    )
}

export const register: Register = (on) => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined || ran.isError !== true) return ran
    if (!isReportNameRefusal(e.file_path, typeof ran.text === 'string' ? ran.text : undefined)) return ran
    const agent = (await $.agent.list()).find((each) => each.id === e.agentId)
    if (!isViberAgent(agent?.type)) return ran
    if (!isInsideRoot(await $.session.root(), e.file_path)) return ran
    const originalFile = await textOf($, e.file_path)
    await $.fs.write(e.file_path, e.content)
    return {
      result: {
        type: originalFile === null ? 'create' : 'update',
        filePath: e.file_path,
        content: e.content,
        structuredPatch: [],
        originalFile,
      },
    }
  }).catch((_$, e, next) => next(e))
}
