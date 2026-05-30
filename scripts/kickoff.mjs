#!/usr/bin/env node
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";
const CYAN  = "\x1b[36m";

console.log(`
${BOLD}${CYAN}Boomkit${RESET}  ${DIM}— by Pixel Boom${RESET}

${BOLD}Run the interactive setup:${RESET}

    ${BOLD}${CYAN}pnpm setup${RESET}

The CLI will ask a few questions, write your config,
run the bootstrap, and start the dev server — then
hand off to your AI editor to build the screens.

${DIM}Already ran setup? Open this folder in Cursor / Claude Code /
Windsurf etc. and say:  start boomkit${RESET}
`);
