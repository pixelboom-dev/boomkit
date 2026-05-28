#!/usr/bin/env node
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";

console.log(`
${BOLD}${CYAN}Boomkit${RESET}  ${DIM}— by Pixel Boom${RESET}

${BOLD}Next step:${RESET} open this folder in your AI editor
(Cursor, Claude Code, Windsurf, etc.) and tell it:

    ${BOLD}start boomkit${RESET}

The agent will read ${BOLD}AGENTS.md${RESET} and walk you through:

  1. Project config       ${DIM}(name, primary color, style, radius)${RESET}
  2. Scaffolding          ${DIM}(pnpm bootstrap — Vite + Shadcn + screens)${RESET}
  3. First run            ${DIM}(pnpm dev → http://localhost:9900)${RESET}

${DIM}Prefer the manual path? See README.md → "Manual path".${RESET}
`);
