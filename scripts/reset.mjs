#!/usr/bin/env node
// Wipes everything `bootstrap` generates so you can re-run it from a clean state.
// Keeps: scripts/, templates/, DESIGN.md, SETUP.md, AGENTS.md, README.md, .gitignore,
// prototype.config.example.json, and your own prototype.config.json.
import { rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RED = "\x1b[31m", GREEN = "\x1b[32m", DIM = "\x1b[2m", BOLD = "\x1b[1m", RESET = "\x1b[0m";

const targets = [
  "src",
  "docs",
  "node_modules",
  "pnpm-lock.yaml",
  ".env",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "index.html",
  "components.json",
  "@", // the broken literal folder shadcn creates when paths aren't resolved
];

console.log(`${BOLD}Resetting Boomkit state${RESET}\n`);

for (const t of targets) {
  const p = join(ROOT, t);
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    console.log(`  ${RED}✗${RESET} removed ${t}`);
  } else {
    console.log(`  ${DIM}· skipped ${t} (not present)${RESET}`);
  }
}

// Restore the seed package.json (without runtime deps) so `pnpm bootstrap` can re-run.
const seedPkg = {
  name: "boomkit",
  private: true,
  type: "module",
  version: "0.1.0",
  description: "AI-native kit for fully-mocked SaaS prototypes. Auth, shell, CRUD ready in minutes. By Pixel Boom.",
  author: "Pixel Boom",
  license: "MIT",
  repository: { type: "git", url: "git+https://github.com/pixelboom-dev/boomkit.git" },
  bugs: { url: "https://github.com/pixelboom-dev/boomkit/issues" },
  homepage: "https://github.com/pixelboom-dev/boomkit#readme",
  keywords: ["saas", "prototype", "mvp", "scaffold", "vite", "shadcn", "tailwind", "ai-native", "pixel-boom"],
  scripts: {
    start: "node scripts/kickoff.mjs",
    bootstrap: "node scripts/bootstrap.mjs",
    reset: "node scripts/reset.mjs",
    dev: "vite",
    build: "tsc -b && vite build",
    preview: "vite preview",
    typecheck: "tsc -b --noEmit",
  },
  engines: { node: ">=20" },
};
writeFileSync(join(ROOT, "package.json"), JSON.stringify(seedPkg, null, 2) + "\n");
console.log(`  ${GREEN}✓${RESET} restored seed package.json`);

console.log(`\n${GREEN}✓ Reset complete.${RESET} Next: ${BOLD}pnpm bootstrap${RESET}\n`);
