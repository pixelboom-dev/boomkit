#!/usr/bin/env node
/**
 * Boomkit interactive setup — zero dependencies, pure Node.js
 * Asks config questions, writes prototype.config.json + DESIGN-RULES.md §0,
 * runs pnpm bootstrap, and hands off to the AI agent.
 */

import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { get as httpsGet } from "node:https";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// ─── ANSI ────────────────────────────────────────────────────────────────────

const A = {
  reset:     "\x1b[0m",
  bold:      "\x1b[1m",
  dim:       "\x1b[2m",
  italic:    "\x1b[3m",
  cyan:      "\x1b[36m",
  cyanBold:  "\x1b[1;36m",
  green:     "\x1b[32m",
  greenBold: "\x1b[1;32m",
  yellow:    "\x1b[33m",
  red:       "\x1b[31m",
  white:     "\x1b[97m",
  whiteDim:  "\x1b[2;97m",
  blueBold:  "\x1b[1;34m",
  magenta:   "\x1b[35m",
  clear:     "\x1b[2J\x1b[H",
  up:        (n) => `\x1b[${n}A`,
  clearLine: "\x1b[2K\r",
};

const c = (color, text) => `${color}${text}${A.reset}`;
const W = 62; // box width (inner)

// ─── BOX DRAWING ─────────────────────────────────────────────────────────────

const box = {
  tl: "╭", tr: "╮", bl: "╰", br: "╯",
  h: "─", v: "│", lm: "├", rm: "┤",
};

function pad(str, width) {
  // strip ANSI before measuring
  const raw = str.replace(/\x1b\[[0-9;]*m/g, "");
  const pad = Math.max(0, width - raw.length);
  return str + " ".repeat(pad);
}

function row(content = "", highlight = false) {
  const inner = pad(content, W);
  const border = highlight ? c(A.cyanBold, box.v) : c(A.dim, box.v);
  process.stdout.write(`${border} ${inner} ${border}\n`);
}

function divider(label = "") {
  if (label) {
    const l = label.replace(/\x1b\[[0-9;]*m/g, "").length;
    const left = 2;
    const right = W - left - l - 2;
    process.stdout.write(
      c(A.dim, box.lm + box.h.repeat(left)) +
      " " + label + " " +
      c(A.dim, box.h.repeat(Math.max(0, right)) + box.rm) + "\n"
    );
  } else {
    process.stdout.write(c(A.dim, box.lm + box.h.repeat(W + 2) + box.rm) + "\n");
  }
}

function topBorder()    { process.stdout.write(c(A.dim, box.tl + box.h.repeat(W + 2) + box.tr) + "\n"); }
function bottomBorder() { process.stdout.write(c(A.dim, box.bl + box.h.repeat(W + 2) + box.br) + "\n"); }

// ─── HEADER ──────────────────────────────────────────────────────────────────

function printHeader() {
  process.stdout.write(A.clear);
  topBorder();
  row();
  const logo = [
    " ██████╗  ██████╗  ██████╗ ███╗   ███╗██╗  ██╗██╗████████╗",
    " ██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║██║ ██╔╝██║╚══██╔══╝",
    " ██████╔╝██║   ██║██║   ██║██╔████╔██║█████╔╝ ██║   ██║   ",
    " ██╔══██╗██║   ██║██║   ██║██║╚██╔╝██║██╔═██╗ ██║   ██║   ",
    " ██████╔╝╚██████╔╝╚██████╔╝██║ ╚═╝ ██║██║  ██╗██║   ██║   ",
    " ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝   ",
  ];
  for (const line of logo) row(c(A.cyanBold, line));
  row();
  row(c(A.dim, "  by Pixel Boom  ·  AI-native prototype kit"));
  row();
  bottomBorder();
  process.stdout.write("\n");
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────

function section(n, label) {
  process.stdout.write("\n");
  divider(c(A.cyanBold, `  ${n}  `) + c(A.white, ` ${label} `));
  process.stdout.write("\n");
}

// ─── TEXT INPUT ──────────────────────────────────────────────────────────────

async function prompt(question, defaultValue = "") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const hint = defaultValue ? c(A.dim, ` (${defaultValue})`) : "";
  const answer = await new Promise((resolve) =>
    rl.question(`  ${c(A.white, "◆")} ${question}${hint}${c(A.dim, " › ")}`, resolve)
  );
  rl.close();
  return answer.trim() || defaultValue;
}

// ─── SELECT (arrow keys) ─────────────────────────────────────────────────────

async function select(question, options, defaultIndex = 0) {
  return new Promise((resolve) => {
    let current = defaultIndex;

    function render(first = false) {
      if (!first) process.stdout.write(A.up(options.length + 1) + A.clearLine);
      process.stdout.write(`  ${c(A.white, "◆")} ${question}\n`);
      for (let i = 0; i < options.length; i++) {
        const selected = i === current;
        const cursor   = selected ? c(A.cyanBold, "  ❯ ") : "    ";
        const label    = selected
          ? c(A.cyanBold, options[i].label)
          : c(A.dim,      options[i].label);
        const hint     = options[i].hint ? c(A.dim, `  ${options[i].hint}`) : "";
        process.stdout.write(A.clearLine + `${cursor}${label}${hint}\n`);
      }
    }

    render(true);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function onKey(key) {
      if (key === "\x1b[A" || key === "k") { current = (current - 1 + options.length) % options.length; render(); }
      else if (key === "\x1b[B" || key === "j") { current = (current + 1) % options.length; render(); }
      else if (key === "\r" || key === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onKey);
        process.stdout.write(A.clearLine);
        process.stdout.write(
          `  ${c(A.green, "◆")} ${question}  ${c(A.cyanBold, options[current].label)}\n`
        );
        resolve(options[current].value);
      } else if (key === "\x03") { process.exit(); }
    }

    process.stdin.on("data", onKey);
  });
}

// ─── CONFIRM ─────────────────────────────────────────────────────────────────

async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await prompt(`${question}`, hint);
  if (answer === hint) return defaultYes;
  return /^y/i.test(answer);
}

// ─── SPINNER ─────────────────────────────────────────────────────────────────

function spinner(label) {
  const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  let i = 0;
  process.stdout.write("\n");
  const id = setInterval(() => {
    process.stdout.write(
      `\r  ${c(A.cyan, frames[i++ % frames.length])}  ${c(A.dim, label)}   `
    );
  }, 80);
  return {
    succeed(msg) {
      clearInterval(id);
      process.stdout.write(`\r  ${c(A.greenBold, "✓")}  ${c(A.white, msg)}\n`);
    },
    fail(msg) {
      clearInterval(id);
      process.stdout.write(`\r  ${c(A.red, "✗")}  ${c(A.red, msg)}\n`);
    },
  };
}

// ─── INFO / SUCCESS / ERROR ───────────────────────────────────────────────────

const info    = (msg) => process.stdout.write(`\n  ${c(A.dim,       "·")}  ${c(A.dim,       msg)}\n`);
const success = (msg) => process.stdout.write(`\n  ${c(A.greenBold, "✓")}  ${c(A.white,     msg)}\n`);
const warn    = (msg) => process.stdout.write(`\n  ${c(A.yellow,    "!")}  ${c(A.yellow,    msg)}\n`);
const fail    = (msg) => { process.stdout.write(`\n  ${c(A.red, "✗")}  ${c(A.red, msg)}\n`); process.exit(1); };

// ─── FETCH PRESET ─────────────────────────────────────────────────────────────

function fetchPreset(brand) {
  const url = `https://raw.githubusercontent.com/voltagent/awesome-design-md/main/${brand}/DESIGN.md`;
  return new Promise((resolve, reject) => {
    httpsGet(url, (res) => {
      if (res.statusCode === 404) return reject(new Error("brand not found"));
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function extractPresetTokens(markdown) {
  // Try to pull primary color, radius, fonts from the markdown.
  // Best-effort — the structure varies per brand.
  const tokens = {};
  const primaryMatch = markdown.match(/primary[^\n]*?:\s*`?(#[0-9a-fA-F]{3,6}|oklch\([^)]+\))/i);
  if (primaryMatch) tokens.primaryLight = primaryMatch[1];
  const radiusMatch = markdown.match(/radius[^\n]*?:\s*`?(Small|Medium|Large|Full)/i);
  if (radiusMatch) tokens.radius = radiusMatch[1];
  return tokens;
}

// ─── WRITE FILES ──────────────────────────────────────────────────────────────

function writeConfig(config) {
  writeFileSync(join(ROOT, "prototype.config.json"), JSON.stringify(config, null, 2) + "\n");
}

function patchDesignRules(config) {
  const path = join(ROOT, "DESIGN-RULES.md");
  if (!existsSync(path)) return;
  let md = readFileSync(path, "utf8");

  const { colors, typography, theme, app } = config;

  // §0.1 colors table
  md = md.replace(
    /(\*\*Primary\*\*\s*\|)[^\n]*/,
    `$1 \`${colors.primary.light}\` | \`${colors.primary.dark}\``
  );

  // §0.3 theme settings
  md = md.replace(/(\*\*Product type\*\*\s*\|)[^\n]*/, `$1 \`${app.productType}\` | SaaS desktop · Website · App`);
  md = md.replace(/(\*\*Style\*\*\s*\|)[^\n]*/,        `$1 \`${theme.style}\` | Vega · Nova · Maia · Lyra · Mira · Luma · Sera · Rhea`);
  md = md.replace(/(\*\*Radius\*\*\s*\|)[^\n]*/,       `$1 \`${theme.radius}\` | Small · Medium · Large · Full`);

  writeFileSync(path, md);
}

// ─── SUMMARY BOX ─────────────────────────────────────────────────────────────

function printSummary(config) {
  process.stdout.write("\n");
  topBorder();
  row(c(A.white, " Configuration summary"));
  divider();
  row(c(A.dim, " App name")    + "  " + c(A.cyanBold, config.app.name));
  row(c(A.dim, " Product")     + "  " + c(A.cyanBold, config.app.productType));
  row(c(A.dim, " Primary ☀")  + "  " + c(A.cyanBold, config.colors.primary.light));
  row(c(A.dim, " Primary ☾")  + "  " + c(A.cyanBold, config.colors.primary.dark));
  if (config.colors.brand?.length) {
    row(c(A.dim, " Brand")     + "  " + c(A.cyanBold, config.colors.brand[0]?.value));
  }
  row(c(A.dim, " Style")       + "  " + c(A.cyanBold, config.theme.style));
  row(c(A.dim, " Radius")      + "  " + c(A.cyanBold, config.theme.radius));
  row();
  bottomBorder();
}

// ─── HAND-OFF SCREEN ─────────────────────────────────────────────────────────

function printHandoff(port) {
  process.stdout.write("\n");
  topBorder();
  row();
  row(c(A.greenBold, " ✓  Setup complete"));
  row();
  divider();
  row();
  row(c(A.white, " Running at") + "  " + c(A.cyanBold, `http://localhost:${port}`));
  row();
  row(c(A.white, " Seed login"));
  row(c(A.dim,   "   email     ") + c(A.cyanBold, "demo@boomkit.dev"));
  row(c(A.dim,   "   password  ") + c(A.cyanBold, "demo"));
  row();
  divider();
  row();
  row(c(A.white, " Next: open this folder in your AI editor and say:"));
  row();
  row("   " + c(A.cyanBold, "start boomkit"));
  row();
  row(c(A.dim, " The agent will scaffold your screens and hand off the prototype."));
  row();
  bottomBorder();
  process.stdout.write("\n");
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  printHeader();

  // ── 1. Prototype identity ────────────────────────────────────────────────
  section("1 / 3", "Your prototype");

  const appName = await prompt("App name", "My SaaS");

  const productType = await select("Product type", [
    { value: "saas-desktop", label: "SaaS desktop", hint: "sidebar · dashboard · CRUD · settings" },
    { value: "website",      label: "Website",      hint: "hero · blog · pricing · contact" },
    { value: "app",          label: "App",           hint: "mobile-first · 430 px viewport · bottom tabs" },
  ]);

  // ── 2. Theme ─────────────────────────────────────────────────────────────
  section("2 / 3", "Theme");

  let primaryLight = "oklch(0.205 0 0)";
  let primaryDark  = "oklch(0.985 0 0)";
  let radius       = "Medium";
  let style        = "Vega";
  let brandColor   = "";

  const themeMode = await select("How do you want to configure the theme?", [
    { value: "preset", label: "Use a preset", hint: "brand palette from awesome-design-md" },
    { value: "manual", label: "Configure manually" },
  ]);

  if (themeMode === "preset") {
    const brandName = await prompt("Brand name (e.g. linear, vercel, stripe)");
    if (brandName) {
      const spin = spinner(`Fetching ${brandName} palette…`);
      try {
        const markdown = await fetchPreset(brandName.toLowerCase());
        const tokens   = extractPresetTokens(markdown);
        spin.succeed(`Preset applied: ${brandName}`);
        if (tokens.primaryLight) { primaryLight = tokens.primaryLight; info(`Primary color: ${primaryLight}`); }
        if (tokens.radius)       { radius = tokens.radius;             info(`Radius: ${radius}`); }
        info("Review the values below and override any if needed.");
        process.stdout.write("\n");
      } catch {
        spin.fail(`Preset "${brandName}" not found — falling back to manual config.`);
      }
    }

    // Always let user override after preset
    const override = await confirm("Override any preset value?", false);
    if (override) {
      primaryLight = await prompt("Primary color — light mode (hex or oklch)", primaryLight);
      primaryDark  = await prompt("Primary color — dark mode  (hex or oklch)", primaryDark);
      radius       = await select("Radius", [
        { value: "Small",  label: "Small" },
        { value: "Medium", label: "Medium" },
        { value: "Large",  label: "Large" },
        { value: "Full",   label: "Full" },
      ], ["Small","Medium","Large","Full"].indexOf(radius));
    }
  } else {
    primaryLight = await prompt("Primary color — light mode (hex or oklch)", primaryLight);
    primaryDark  = await prompt("Primary color — dark mode  (hex or oklch)", primaryDark);
    brandColor   = await prompt("Brand color — optional (hex or Enter to skip)", "");

    style = await select("Style", [
      { value: "Vega", label: "Vega" },
      { value: "Nova", label: "Nova" },
      { value: "Maia", label: "Maia" },
      { value: "Lyra", label: "Lyra" },
      { value: "Mira", label: "Mira" },
      { value: "Luma", label: "Luma" },
      { value: "Sera", label: "Sera" },
      { value: "Rhea", label: "Rhea" },
    ]);

    radius = await select("Radius", [
      { value: "Small",  label: "Small" },
      { value: "Medium", label: "Medium" },
      { value: "Large",  label: "Large" },
      { value: "Full",   label: "Full" },
    ], 1);
  }

  // ── 3. Confirm & bootstrap ───────────────────────────────────────────────
  section("3 / 3", "Ready");

  const config = {
    app: { name: appName, productType, devPort: 9900, previewPort: 9901 },
    colors: {
      primary: { light: primaryLight, dark: primaryDark },
      brand: brandColor ? [{ name: "brand-primary", value: brandColor }] : [],
    },
    typography: { sans: null, serif: null, mono: null, brand: null, heading: "sans", body: "sans" },
    theme: { style, iconLibrary: "Lucide", radius },
  };

  printSummary(config);

  const go = await confirm("Bootstrap the prototype with these settings?");
  if (!go) { warn("Aborted. Run pnpm setup again to restart."); process.exit(0); }

  // Write config + patch DESIGN-RULES.md
  writeConfig(config);
  patchDesignRules(config);
  success("prototype.config.json written");

  // Run bootstrap
  process.stdout.write("\n");
  const bSpin = spinner("Running pnpm bootstrap…");
  try {
    execSync("pnpm bootstrap", {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, CI: "1", npm_config_yes: "true", FORCE_COLOR: "0" },
    });
    bSpin.succeed("Bootstrap complete");
  } catch (e) {
    bSpin.fail("Bootstrap failed");
    process.stdout.write(c(A.dim, e.stderr?.toString() ?? e.message) + "\n");
    fail("Fix the error above and re-run pnpm bootstrap manually.");
  }

  // Start dev server in background
  const devSpin = spinner("Starting dev server…");
  const devProc = spawn("pnpm", ["dev"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
    detached: true,
  });

  await new Promise((resolve) => {
    devProc.stdout.on("data", (data) => {
      if (data.toString().includes("localhost")) {
        devSpin.succeed("Dev server running");
        resolve();
      }
    });
    setTimeout(resolve, 8000); // fallback
  });

  devProc.unref();

  printHandoff(config.app.devPort);
}

main().catch((e) => {
  process.stdout.write(`\n${c(A.red, "✗")}  Unexpected error: ${e.message}\n`);
  process.exit(1);
});
