#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const execAsync = promisify(exec);

const DEFAULT_URL = "http://localhost:1234/api/v1/chat";
const DEFAULT_MODEL = "google/gemma-4-12b";
const ROOT = process.cwd();
const TEXT_LIMIT = 80_000;

const ignoredDirs = new Set([
  ".git",
  ".next",
  ".data",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

const neverWriteNames = new Set([".env", ".env.local", ".env.production"]);

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const rl = createInterface({ input, output });

try {
  if (args.ping) {
    const message = await callLmcode({
      systemPrompt: "Reply with exactly: ok",
      inputText: "ping",
    });
    console.log(message);
    process.exit(0);
  }

  const prompt = args.prompt.join(" ").trim();
  if (prompt) {
    await runTask(prompt);
  } else {
    await runRepl();
  }
} finally {
  rl.close();
}

function parseArgs(argv) {
  const parsed = {
    help: false,
    ping: false,
    yes: false,
    dryRun: false,
    noCommands: false,
    maxSteps: 24,
    prompt: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") parsed.help = true;
    else if (arg === "--ping") parsed.ping = true;
    else if (arg === "-y" || arg === "--yes") parsed.yes = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--no-commands") parsed.noCommands = true;
    else if (arg === "--max-steps") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("--max-steps requires a positive integer");
      }
      parsed.maxSteps = value;
      index += 1;
    } else {
      parsed.prompt.push(arg);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`lmcode-agent

Usage:
  npm run lmcode -- "describe the change"
  npm run lmcode -- --yes "apply without confirmations"
  npm run lmcode -- --dry-run "show planned actions only"
  npm run lmcode -- --no-commands "edit files only"
  npm run lmcode -- --ping

Environment:
  LMCODE_URL     ${DEFAULT_URL}
  LMCODE_MODEL   ${DEFAULT_MODEL}

Notes:
  - File tools are restricted to this workspace.
  - Shell commands require confirmation unless --yes is passed.
  - Writes to .env files, .git, .next, node_modules, build outputs are blocked.
`);
}

async function runRepl() {
  console.log("lmcode agent pronto. Scrivi un task, oppure /exit.");
  while (true) {
    const line = (await rl.question("\nlmcode> ")).trim();
    if (!line) continue;
    if (line === "/exit" || line === "/quit") break;
    await runTask(line);
  }
}

async function runTask(userTask) {
  const context = await getWorkspaceContext();
  const messages = [
    `Workspace root: ${ROOT}`,
    context,
    `User task: ${userTask}`,
  ];

  console.log(`\nTask: ${userTask}`);

  for (let step = 1; step <= args.maxSteps; step += 1) {
    const action = await askForAction(messages);
    const label = action.action || "unknown";
    console.log(`\n[${step}] ${label}${action.path ? ` ${action.path}` : ""}`);

    if (label === "finish") {
      if (action.summary) console.log(`\n${action.summary}`);
      return;
    }

    const observation = await executeAction(action);
    messages.push(`Action ${step}: ${JSON.stringify(action)}`);
    messages.push(`Observation ${step}: ${observation}`);
  }

  console.log(`\nStopped after ${args.maxSteps} steps. Increase with --max-steps if needed.`);
}

async function askForAction(history) {
  const reply = await callLmcode({
    systemPrompt: buildSystemPrompt(),
    inputText: history.join("\n\n---\n\n"),
  });

  try {
    return parseJsonObject(reply);
  } catch {
    return {
      action: "finish",
      summary: `Il modello non ha restituito JSON valido. Risposta:\n${reply}`,
    };
  }
}

function buildSystemPrompt() {
  return `You are a local coding agent running inside one workspace.
You must solve the user's development task by choosing exactly one tool action per response.
Return only one JSON object. No markdown. No comments. No extra text.

Allowed actions:
{"action":"list_files","path":"optional relative directory"}
{"action":"read_file","path":"relative file path"}
{"action":"write_file","path":"relative file path","content":"full UTF-8 file content"}
{"action":"replace_in_file","path":"relative file path","old":"exact text to replace","new":"replacement text"}
{"action":"run_command","command":"shell command to run from workspace root","reason":"why this is needed"}
{"action":"finish","summary":"short summary and any commands the user should run"}

Rules:
- Work only inside the workspace.
- Prefer read_file before editing an existing file.
- Do not modify secrets or .env files.
- Do not touch .git, .next, node_modules, build outputs, or lock files unless explicitly necessary.
- For this project, Next.js may be newer than your training data. Before editing app, route, server, or config code that depends on Next.js APIs, read the relevant guide under node_modules/next/dist/docs/.
- Keep changes focused on the user task.
- Use run_command for verification after edits when useful.
- If you are done, use finish.`;
}

async function callLmcode({ systemPrompt, inputText }) {
  const url = process.env.LMCODE_URL || DEFAULT_URL;
  const model = process.env.LMCODE_MODEL || DEFAULT_MODEL;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      system_prompt: systemPrompt,
      input: inputText,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`lmcode HTTP ${response.status}: ${text}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return text;
  }

  if (typeof data.output === "string") return data.output;
  if (Array.isArray(data.output)) {
    const message = [...data.output].reverse().find((item) => item?.type === "message");
    if (message?.content) return String(message.content);
  }
  if (data.message) return String(data.message);
  if (data.content) return String(data.content);

  return JSON.stringify(data);
}

function parseJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("No JSON object found");
  }
}

async function executeAction(action) {
  try {
    switch (action.action) {
      case "list_files":
        return await listFiles(action.path || ".");
      case "read_file":
        return await readFile(action.path);
      case "write_file":
        return await writeFile(action.path, action.content);
      case "replace_in_file":
        return await replaceInFile(action.path, action.old, action.new);
      case "run_command":
        return await runCommand(action.command, action.reason);
      default:
        return `Unknown action: ${action.action}`;
    }
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function getWorkspaceContext() {
  const parts = [];

  for (const file of ["AGENTS.md", "package.json", "tsconfig.json", "next.config.ts"]) {
    try {
      const content = await fs.readFile(path.join(ROOT, file), "utf8");
      parts.push(`${file}:\n${truncate(content, 12_000)}`);
    } catch {
      // Optional context file.
    }
  }

  parts.push(`Files:\n${await listFiles(".")}`);
  return parts.join("\n\n");
}

async function listFiles(relativePath) {
  const start = resolveInside(relativePath || ".");
  const stat = await fs.stat(start);
  if (!stat.isDirectory()) return path.relative(ROOT, start);

  const lines = [];
  await walk(start, lines, 0);
  return lines.slice(0, 450).join("\n") + (lines.length > 450 ? "\n...truncated" : "");
}

async function walk(directory, lines, depth) {
  if (depth > 6) return;

  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (shouldSkipListEntry(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(ROOT, absolute);
    lines.push(entry.isDirectory() ? `${relative}/` : relative);
    if (entry.isDirectory()) await walk(absolute, lines, depth + 1);
  }
}

function shouldSkipListEntry(name) {
  return ignoredDirs.has(name) || name.endsWith(".tsbuildinfo");
}

async function readFile(relativePath) {
  const absolute = resolveInside(relativePath);
  const stat = await fs.stat(absolute);
  if (!stat.isFile()) throw new Error("Path is not a file");

  const relative = path.relative(ROOT, absolute);
  const isNextDocs = relative.startsWith(path.join("node_modules", "next", "dist", "docs"));
  if (relative.split(path.sep).some((part) => ignoredDirs.has(part)) && !isNextDocs) {
    throw new Error("Reading this generated/dependency path is blocked");
  }

  const content = await fs.readFile(absolute, "utf8");
  return truncate(content, TEXT_LIMIT);
}

async function writeFile(relativePath, content) {
  if (typeof content !== "string") throw new Error("content must be a string");
  const absolute = resolveInside(relativePath);
  assertWritablePath(absolute);

  if (args.dryRun) {
    return `Dry run: would write ${path.relative(ROOT, absolute)} (${content.length} chars)`;
  }

  if (!(await confirm(`Write ${path.relative(ROOT, absolute)}?`))) {
    return "Skipped by user";
  }

  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content, "utf8");
  return `Wrote ${path.relative(ROOT, absolute)} (${content.length} chars)`;
}

async function replaceInFile(relativePath, oldText, newText) {
  if (typeof oldText !== "string" || typeof newText !== "string") {
    throw new Error("old and new must be strings");
  }

  const absolute = resolveInside(relativePath);
  assertWritablePath(absolute);
  const content = await fs.readFile(absolute, "utf8");
  const count = content.split(oldText).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly one match, found ${count}`);
  }

  if (args.dryRun) {
    return `Dry run: would update ${path.relative(ROOT, absolute)}`;
  }

  if (!(await confirm(`Replace text in ${path.relative(ROOT, absolute)}?`))) {
    return "Skipped by user";
  }

  await fs.writeFile(absolute, content.replace(oldText, newText), "utf8");
  return `Updated ${path.relative(ROOT, absolute)}`;
}

async function runCommand(command, reason) {
  if (args.noCommands) return "Command skipped because --no-commands is enabled";
  if (typeof command !== "string" || !command.trim()) throw new Error("command is required");

  if (args.dryRun) {
    return `Dry run: would run ${command}`;
  }

  if (!(await confirm(`Run command: ${command}${reason ? `\nReason: ${reason}` : ""}`))) {
    return "Skipped by user";
  }

  const { stdout, stderr } = await execAsync(command, {
    cwd: ROOT,
    timeout: 120_000,
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true,
  });

  return truncate([stdout, stderr].filter(Boolean).join("\n"), TEXT_LIMIT) || "Command completed with no output";
}

async function confirm(question) {
  if (args.yes) return true;
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  return answer === "y" || answer === "yes" || answer === "s" || answer === "si";
}

function resolveInside(relativePath) {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error("path is required");
  }

  const absolute = path.resolve(ROOT, relativePath);
  const relation = path.relative(ROOT, absolute);
  if (relation.startsWith("..") || path.isAbsolute(relation)) {
    throw new Error("Path escapes workspace");
  }
  return absolute;
}

function assertWritablePath(absolute) {
  const relative = path.relative(ROOT, absolute);
  const parts = relative.split(path.sep);
  if (parts.some((part) => ignoredDirs.has(part))) {
    throw new Error("Writing this generated/dependency path is blocked");
  }
  if (neverWriteNames.has(path.basename(relative))) {
    throw new Error("Writing env files is blocked");
  }
}

function truncate(text, limit) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n...truncated ${text.length - limit} chars`;
}
