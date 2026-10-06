const GUARDED_NAME = /^(report|summary|findings|analysis).*\.md$/i;
const GUARD_TEXT = "Subagents should return findings as text";
const DRIVE = /^[A-Za-z]:\//;

function slashed(path: string): string {
  return path.replace(/\\/g, "/");
}

export function isViberAgent(type: string | undefined): boolean {
  return type !== undefined && type.startsWith("viber:");
}

export function isReportNameRefusal(filePath: string, errorText: string | undefined): boolean {
  if (errorText === undefined || !errorText.includes(GUARD_TEXT)) return false;
  const name = slashed(filePath).split("/").pop() ?? "";
  return GUARDED_NAME.test(name);
}

export function isInsideRoot(root: string, filePath: string): boolean {
  const file = slashed(filePath);
  if (!file.startsWith("/") && !DRIVE.test(file)) return false;
  if (file.split("/").some((segment) => segment === "." || segment === "..")) return false;
  const base = slashed(root).replace(/\/+$/, "") + "/";
  return DRIVE.test(base) ? file.toLowerCase().startsWith(base.toLowerCase()) : file.startsWith(base);
}
