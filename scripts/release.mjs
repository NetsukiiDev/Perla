// Release helper. The version lives in package.json (lib/version.ts reads it
// from there); VERSION is a plain-text mirror for anything outside the app
// that wants to read it without parsing JSON, and is only ever written here
// so the two cannot drift.
//
//   node scripts/release.mjs 0.2.11     prepare: bump + changelog + 2 commits
//   node scripts/release.mjs --publish  publish: merge to master, tag, release
//
// Kept as two steps because they answer different questions: "is this what I
// want to ship" (inspect the commits, run the build) and "ship it". Publish
// tags the merge commit on master, which is where every previous tag lives.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE_BRANCH = "master";

const paths = {
  pkg: join(ROOT, "package.json"),
  version: join(ROOT, "VERSION"),
  changelog: join(ROOT, "CHANGELOG.md"),
};

function git(args, opts = {}) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", ...opts }).trim();
}

function run(cmd, args) {
  console.log(`  $ ${cmd} ${args.join(" ")}`);
  return execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function currentVersion() {
  return JSON.parse(readFileSync(paths.pkg, "utf8")).version;
}

// Same comparison as lib/version.ts's isNewerVersion, so a version this
// script accepts is one the in-app update check will also see as newer.
function isNewer(a, b) {
  const parse = (v) => (/^(\d+)\.(\d+)\.(\d+)$/.exec(v) ?? []).slice(1).map(Number);
  const x = parse(a);
  const y = parse(b);
  if (x.length !== 3 || y.length !== 3) return false;
  for (let i = 0; i < 3; i++) {
    if (x[i] > y[i]) return true;
    if (x[i] < y[i]) return false;
  }
  return false;
}

function assertCleanTree() {
  if (git(["status", "--porcelain"])) {
    fail("Working tree has uncommitted changes. Commit or stash them first.");
  }
}

function prepare(version, { allowEmptyChangelog }) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`"${version}" is not a x.y.z version.`);
  assertCleanTree();

  const from = currentVersion();
  if (version === from) fail(`Already at ${from}.`);
  if (!isNewer(version, from)) fail(`${version} is not newer than the current ${from}.`);

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
  const changelog = readFileSync(paths.changelog, "utf8");
  const eol = changelog.includes("\r\n") ? "\r\n" : "\n";
  // [ \t\r]* rather than \s*: \s swallows the newline and the blank line that
  // follows the heading, and a bare [ \t]* would never match this file, which
  // is CRLF in a Windows working tree.
  const unreleased = /^## Non rilasciato[ \t\r]*$/m;

  let nextChangelog;
  if (unreleased.test(changelog)) {
    nextChangelog = changelog.replace(unreleased, `## ${version} — ${today}`);
  } else if (allowEmptyChangelog) {
    // A bump with nothing to say (a re-tag, a build fix) still gets a heading,
    // so the file never has a version missing from it.
    nextChangelog = changelog.replace(
      /^# Changelog[ \t\r]*$/m,
      `# Changelog${eol}${eol}## ${version} — ${today}${eol}${eol}_Version bump — nessuna modifica funzionale._`,
    );
  } else {
    fail(
      'CHANGELOG.md has no "## Non rilasciato" section.\n' +
        "  Add one describing this release, or pass --allow-empty-changelog for a bare bump.",
    );
  }

  writeFileSync(paths.changelog, nextChangelog);
  // Replaces only the first "version" key — the package's own, before any
  // dependency entry — and leaves the rest of the file byte-for-byte alone.
  writeFileSync(paths.pkg, readFileSync(paths.pkg, "utf8").replace(/"version":\s*"[^"]+"/, `"version": "${version}"`));
  writeFileSync(paths.version, `${version}\n`);

  console.log(`\nPreparing ${from} → ${version}\n`);
  run("git", ["add", "CHANGELOG.md"]);
  run("git", ["commit", "-m", `docs: finalize ${version} changelog entry`]);
  run("git", ["add", "VERSION", "package.json"]);
  run("git", ["commit", "-m", `v${version}`]);

  console.log(`\n✔ ${version} prepared on ${git(["rev-parse", "--abbrev-ref", "HEAD"])}.`);
  console.log("  Review it (npm run build), then: node scripts/release.mjs --publish\n");
}

function publish() {
  assertCleanTree();
  const version = currentVersion();
  const tag = `v${version}`;
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);

  if (branch === RELEASE_BRANCH) fail(`Run this from the development branch, not ${RELEASE_BRANCH}.`);
  if (git(["tag", "--list", tag])) fail(`Tag ${tag} already exists. Bump the version first.`);
  if (git(["log", "-1", "--format=%s"]) !== tag) {
    fail(`HEAD is not the "${tag}" commit — run the prepare step first.`);
  }
  try {
    execFileSync("gh", ["--version"], { stdio: "ignore" });
  } catch {
    fail("The GitHub CLI (gh) is required to publish the release.");
  }

  console.log(`\nPublishing ${tag} from ${branch}\n`);
  run("git", ["push", "origin", branch]);
  run("git", ["checkout", RELEASE_BRANCH]);
  try {
    run("git", ["merge", branch, "--no-edit"]);
    run("git", ["push", "origin", RELEASE_BRANCH]);
    // The tag goes on the merge commit, not on the branch commit: every
    // previous release tag is reachable from master only.
    run("git", ["tag", tag]);
    run("git", ["push", "origin", tag]);
    run("gh", ["release", "create", tag, "--title", tag, "--generate-notes"]);
  } finally {
    run("git", ["checkout", branch]);
  }

  console.log(`\n✔ ${tag} published. https://github.com/NetsukiiDev/Perla/releases/tag/${tag}\n`);
}

const args = process.argv.slice(2);
if (args.includes("--publish")) {
  publish();
} else {
  const version = args.find((a) => !a.startsWith("--"));
  if (!version) {
    console.error("Usage: node scripts/release.mjs <x.y.z> [--allow-empty-changelog]\n       node scripts/release.mjs --publish");
    process.exit(1);
  }
  prepare(version, { allowEmptyChangelog: args.includes("--allow-empty-changelog") });
}
