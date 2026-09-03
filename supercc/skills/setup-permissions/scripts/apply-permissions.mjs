#!/usr/bin/env node
// Scala wybrane bloki reguł z references/rules.json do pliku ustawień Claude Code.
// Bloki z sekcją "memory" trafiają dodatkowo do pamięci użytkownika (CLAUDE.md obok pliku ustawień),
// w oznaczonym bloku supercc — tylko on jest nadpisywany, reszta pliku zostaje nietknięta.
// Idempotentny: powtórne uruchomienie nic nie zmienia. Przed każdym zapisem robi kopię.
//
//   node apply-permissions.mjs --list
//   node apply-permissions.mjs --preset fast
//   node apply-permissions.mjs --blocks secrets-core,power --mode auto
//   node apply-permissions.mjs --blocks network --dry-run
//   node apply-permissions.mjs --remove secrets-strict
//   node apply-permissions.mjs --audit

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RULES = JSON.parse(readFileSync(join(HERE, '..', 'references', 'rules.json'), 'utf8'));
const LISTS = ['allow', 'ask', 'deny'];
const MODES = ['default', 'acceptEdits', 'plan', 'auto', 'dontAsk', 'bypassPermissions'];
const MEMORY_BEGIN = '<!-- supercc:setup-permissions:begin -->';
const MEMORY_END = '<!-- supercc:setup-permissions:end -->';

// ---------------------------------------------------------------- argumenty

function parseArgs(argv) {
  const out = { blocks: [], remove: [], dryRun: false, list: false, audit: false, mode: null, file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`Brak wartości dla ${a}`);
      return v;
    };
    if (a === '--list') out.list = true;
    else if (a === '--audit') out.audit = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--preset') {
      const p = next();
      if (!RULES.presets[p]) fail(`Nieznany preset: ${p}. Dostępne: ${Object.keys(RULES.presets).join(', ')}`);
      out.blocks.push(...RULES.presets[p]);
    } else if (a === '--blocks') out.blocks.push(...next().split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--remove') out.remove.push(...next().split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--mode') out.mode = next();
    else if (a === '--file') out.file = next();
    else fail(`Nieznany argument: ${a}`);
  }
  return out;
}

function fail(msg) {
  console.error(`BŁĄD: ${msg}`);
  process.exit(1);
}

function settingsPath(override) {
  if (override) return resolve(override);
  const dir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
  return join(dir, 'settings.json');
}

// ------------------------------------------------------------------ pomocnicze

function readSettings(path) {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`${path} nie jest poprawnym JSON-em (${e.message}). Napraw plik ręcznie, zanim uruchomisz skrypt ponownie.`);
  }
}

function mergeList(existing = [], incoming = []) {
  const seen = new Set(existing);
  const added = [];
  for (const rule of incoming) {
    if (!seen.has(rule)) {
      seen.add(rule);
      added.push(rule);
    }
  }
  return { list: [...existing, ...added], added };
}

function collect(blockIds) {
  const perms = { allow: [], ask: [], deny: [] };
  const autoMode = {};
  const memory = [];
  const unknown = [];
  for (const id of blockIds) {
    const b = RULES.blocks[id];
    if (!b) {
      unknown.push(id);
      continue;
    }
    for (const k of LISTS) if (b.permissions?.[k]) perms[k].push(...b.permissions[k]);
    for (const [k, v] of Object.entries(b.autoMode || {})) (autoMode[k] ||= []).push(...v);
    if (b.memory) memory.push(...b.memory);
  }
  if (unknown.length) fail(`Nieznane bloki: ${unknown.join(', ')}. Uruchom --list, żeby zobaczyć dostępne.`);
  return { perms, autoMode, memory };
}

// ------------------------------------------------------------ pamięć użytkownika

function memoryPath(settingsFile) {
  return join(dirname(settingsFile), 'CLAUDE.md');
}

// body === null usuwa blok supercc. Zwraca null, gdy plik już jest w docelowym stanie.
function renderMemory(path, body) {
  const existing = existsSync(path) ? readFileSync(path, 'utf8').replace(/^﻿/, '') : '';
  const block = body === null ? '' : `${MEMORY_BEGIN}\n${body}\n${MEMORY_END}`;
  const marked = new RegExp(`\\n*${MEMORY_BEGIN}[\\s\\S]*?${MEMORY_END}\\n*`);
  let next;
  if (marked.test(existing)) next = existing.replace(marked, block ? `\n\n${block}\n` : '\n').replace(/^\n+/, '');
  else if (!block) next = existing;
  else next = existing.trim() ? `${existing.trimEnd()}\n\n${block}\n` : `${block}\n`;
  return next === existing ? null : next;
}

// --------------------------------------------------------------------- audyt

const IGNORED_TOOL_RULE = /^(Write|Glob|MultiEdit|NotebookEdit)\(/;
const BLANKET_SHELL_ALLOW = /^(Bash|PowerShell)(\(\*\))?$/;
const INTERPRETER_ALLOW = /^(Bash|PowerShell)\((npx|docker exec|devbox run|mise exec|direnv exec|bash|sh|zsh|python|python3|node|perl|ruby)[ *]/;

function audit(settings, path) {
  const isUserSettings = resolve(path).toLowerCase() === settingsPath(null).toLowerCase();
  const problems = [];
  const perms = settings.permissions || {};

  for (const kind of LISTS) {
    for (const rule of perms[kind] || []) {
      const spec = rule.match(/^[A-Za-z_*]+\((.*)\)$/)?.[1] ?? null;
      if (IGNORED_TOOL_RULE.test(rule)) {
        problems.push(`[${kind}] ${rule} — reguły ścieżkowe dla Write/Glob/MultiEdit/NotebookEdit są wczytywane, ale nigdy sprawdzane. Użyj Edit(...) albo Read(...).`);
      }
      if (/^(Read|Edit)\(/.test(rule) && spec && spec.startsWith('/') && !spec.startsWith('//') && isUserSettings) {
        problems.push(`[${kind}] ${rule} — pojedynczy '/' w ustawieniach użytkownika kotwiczy się w ~/.claude/, nie w korzeniu. Użyj '//' albo '~/'.`);
      }
      if (/^Bash\(command:/.test(rule) || /^(Read|Edit)\(file_path:/.test(rule) || /^WebFetch\(url:/.test(rule)) {
        problems.push(`[${kind}] ${rule} — głównego pola treści narzędzia nie da się dopasować przez param:. Claude Code ignoruje tę regułę.`);
      }
      if (kind === 'allow' && INTERPRETER_ALLOW.test(rule)) {
        problems.push(`[allow] ${rule} — szeroka zgoda na dowolne wykonanie kodu. W trybie auto i tak jest zawieszana, a w pozostałych trybach otwiera furtkę.`);
      }
      if (kind === 'allow' && BLANKET_SHELL_ALLOW.test(rule) && perms.defaultMode !== 'auto') {
        problems.push(`[allow] ${rule} — zgoda na każdą komendę powłoki bez pytania. Reguły deny nadal wygrywają, ale w trybie "${perms.defaultMode ?? 'default'}" nic poza nimi nie zatrzyma wykonania (w trybie auto ta reguła jest zawieszana).`);
      }
      if (kind === 'allow' && /^mcp__\*/.test(rule)) {
        problems.push(`[allow] ${rule} — glob bez literalnego prefiksu mcp__<serwer>__ jest pomijany z ostrzeżeniem.`);
      }
    }
  }

  for (const [section, list] of Object.entries(settings.autoMode || {})) {
    if (Array.isArray(list) && list.length && !list.includes('$defaults') && ['allow', 'soft_deny', 'hard_deny', 'environment'].includes(section)) {
      problems.push(`[autoMode.${section}] brak tokenu "$defaults" — ta lista zastępuje w całości wbudowane reguły klasyfikatora.`);
    }
  }

  if (settings.autoMode && !isUserSettings) {
    problems.push('[autoMode] klasyfikator nie czyta autoMode z ustawień projektu — przenieś blok do ~/.claude/settings.json.');
  }

  const mode = perms.defaultMode;
  if (mode && !MODES.includes(mode)) {
    problems.push(`[permissions.defaultMode] "${mode}" nie jest jedną z wartości: ${MODES.join(', ')}.`);
  }

  return problems;
}

// ---------------------------------------------------------------------- main

const args = parseArgs(process.argv.slice(2));

if (args.list) {
  console.log('Presety:');
  for (const [name, ids] of Object.entries(RULES.presets)) console.log(`  ${name.padEnd(10)} ${ids.join(', ')}`);
  console.log('\nBloki:');
  for (const [id, b] of Object.entries(RULES.blocks)) {
    const n = LISTS.reduce((a, k) => a + (b.permissions?.[k]?.length || 0), 0) +
      Object.values(b.autoMode || {}).reduce((a, v) => a + v.length, 0);
    console.log(`\n  ${id}${b.recommended ? '  [zalecany]' : ''}  (${n} reguł${b.memory ? ' + wpis do CLAUDE.md' : ''})`);
    console.log(`    ${b.title}`);
    console.log(`    ${b.summary}`);
    console.log(`    Koszt: ${b.tradeoff}`);
  }
  process.exit(0);
}

const path = settingsPath(args.file);
const settings = readSettings(path);

if (args.audit) {
  const problems = audit(settings, path);
  console.log(`Audyt: ${path}`);
  if (!problems.length) console.log('  Nie znaleziono problemów.');
  else problems.forEach((p) => console.log(`  - ${p}`));
  process.exit(0);
}

if (!args.blocks.length && !args.remove.length && !args.mode) {
  fail('Nie podano nic do zrobienia. Użyj --list, --audit, --preset, --blocks, --remove albo --mode.');
}

if (args.mode && !MODES.includes(args.mode)) {
  fail(`--mode musi być jedną z wartości: ${MODES.join(', ')}`);
}

const blocks = [...new Set(args.blocks)];
const removals = [...new Set(args.remove)];
const { perms: incoming, autoMode: incomingAuto, memory: incomingMemory } = collect(blocks);
const { perms: dropping, autoMode: droppingAuto, memory: droppingMemory } = collect(removals);

const changes = [];
const next = structuredClone(settings);
next.permissions ||= {};

for (const kind of LISTS) {
  const before = next.permissions[kind] || [];
  const drop = new Set(dropping[kind].filter((r) => !incoming[kind].includes(r)));
  const kept = before.filter((r) => !drop.has(r));
  const removed = before.filter((r) => drop.has(r));
  const { list, added } = mergeList(kept, incoming[kind]);
  if (added.length || removed.length) {
    next.permissions[kind] = list;
    if (added.length) changes.push(`permissions.${kind}: +${added.length}`);
    if (removed.length) changes.push(`permissions.${kind}: -${removed.length}`);
  } else if (list.length) {
    next.permissions[kind] = list;
  }
}

for (const [section, rules] of Object.entries(incomingAuto)) {
  next.autoMode ||= {};
  const before = next.autoMode[section] || [];
  const { list, added } = mergeList(before, rules);
  if (!list.includes('$defaults')) list.unshift('$defaults');
  if (added.length || list.length !== before.length) {
    next.autoMode[section] = list;
    changes.push(`autoMode.${section}: +${added.length}`);
  }
}

for (const [section, rules] of Object.entries(droppingAuto)) {
  if (!next.autoMode?.[section]) continue;
  const drop = new Set(rules.filter((r) => r !== '$defaults' && !(incomingAuto[section] || []).includes(r)));
  const kept = next.autoMode[section].filter((r) => !drop.has(r));
  const removed = next.autoMode[section].length - kept.length;
  if (removed) {
    next.autoMode[section] = kept.length === 1 && kept[0] === '$defaults' ? undefined : kept;
    if (next.autoMode[section] === undefined) delete next.autoMode[section];
    changes.push(`autoMode.${section}: -${removed}`);
  }
  if (next.autoMode && Object.keys(next.autoMode).length === 0) delete next.autoMode;
}

if (args.mode && next.permissions.defaultMode !== args.mode) {
  changes.push(`permissions.defaultMode: ${next.permissions.defaultMode ?? '(brak)'} -> ${args.mode}`);
  next.permissions.defaultMode = args.mode;
}

const serialized = JSON.stringify(next, null, 2) + '\n';
const settingsChanged = changes.length > 0;

const mPath = memoryPath(path);
let memoryContent = null;
if (incomingMemory.length) {
  memoryContent = renderMemory(mPath, incomingMemory.join('\n'));
  if (memoryContent !== null) changes.push('CLAUDE.md: blok supercc zapisany');
} else if (droppingMemory.length) {
  memoryContent = renderMemory(mPath, null);
  if (memoryContent !== null) changes.push('CLAUDE.md: blok supercc usunięty');
}

console.log(`Plik ustawień: ${path}`);
if (memoryContent !== null) console.log(`Pamięć:        ${mPath}`);
console.log(`Bloki dodane:  ${blocks.length ? blocks.join(', ') : '(żaden)'}`);
if (removals.length) console.log(`Bloki usunięte: ${removals.join(', ')}`);

if (!changes.length) {
  console.log('Bez zmian — te reguły już tam są.');
} else {
  console.log(`Zmiany:        ${changes.join(' | ')}`);
}

if (args.dryRun) {
  console.log('\n--dry-run: nic nie zapisano.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

function backup(file) {
  if (!existsSync(file)) return;
  const copy = `${file}.bak-${stamp}`;
  copyFileSync(file, copy);
  console.log(`Kopia:         ${copy}`);
}

if (settingsChanged) {
  mkdirSync(dirname(path), { recursive: true });
  backup(path);
  writeFileSync(path, serialized, 'utf8');
  JSON.parse(readFileSync(path, 'utf8')); // zapis musi dać poprawny JSON
  console.log('Zapisano ustawienia.');
}

if (memoryContent !== null) {
  mkdirSync(dirname(mPath), { recursive: true });
  backup(mPath);
  writeFileSync(mPath, memoryContent, 'utf8');
  console.log('Zapisano pamięć użytkownika.');
}

const problems = audit(next, path);
if (problems.length) {
  console.log('\nAudyt po zapisie:');
  problems.forEach((p) => console.log(`  - ${p}`));
}

const totals = LISTS.map((k) => `${k}=${next.permissions?.[k]?.length ?? 0}`).join(' ');
console.log(`\nStan reguł: ${totals} | defaultMode=${next.permissions?.defaultMode ?? '(niezmieniony)'}`);
