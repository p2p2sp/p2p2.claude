/*
 * paths.ts - separator-agnostic comparison of paths a shell script printed.
 *
 * A shipped script joins with "/" whatever path it was handed, so on Windows
 * its stdout mixes the caller's native separators with its own forward
 * slashes ("C:\Users\...\tmp/status.md"). A test that builds the expected
 * string with path.join would compare "\" against "/" and fail for no real
 * reason - so both sides go through `slash` first.
 */

/** Every backslash rewritten as "/", so two spellings of one path compare
 *  equal. Windows-only in effect - a no-op on POSIX. */
export function slash(value: string): string {
  return value.replace(/\\/g, "/");
}
