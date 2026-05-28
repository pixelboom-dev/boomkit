#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = join(ROOT, "prototype.config.json");
const TEMPLATES = join(ROOT, "templates");

const BOLD = "\x1b[1m", DIM = "\x1b[2m", RED = "\x1b[31m", GREEN = "\x1b[32m", RESET = "\x1b[0m";
const step = (n, msg) => console.log(`${BOLD}▸ [${n}]${RESET} ${msg}`);
const fail = (msg) => { console.error(`${RED}✗${RESET} ${msg}`); process.exit(1); };

if (!existsSync(CONFIG_PATH)) {
  fail(`prototype.config.json not found.
  Run:  cp prototype.config.example.json prototype.config.json
  Then edit it and re-run: pnpm bootstrap`);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const { app, colors, typography, theme } = config;

const RADIUS_MAP = { Small: "0.25rem", Medium: "0.5rem", Large: "1rem", Full: "9999px" };
const radius = RADIUS_MAP[theme.radius] ?? RADIUS_MAP.Medium;

/* ---------- 1. package.json ---------- */
step("1/8", "Writing package.json");
writeFileSync(join(ROOT, "package.json"), JSON.stringify({
  name: app.name.toLowerCase().replace(/\s+/g, "-"),
  private: true,
  type: "module",
  scripts: {
    start: "node scripts/kickoff.mjs",
    bootstrap: "node scripts/bootstrap.mjs",
    dev: "vite",
    build: "tsc -b && vite build",
    preview: "vite preview",
    typecheck: "tsc -b --noEmit",
  },
  dependencies: {
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.27.0",
    zod: "^3.23.0",
    zustand: "^5.0.0",
    "@tanstack/react-query": "^5.59.0",
    sonner: "^1.7.0",
    "class-variance-authority": "^0.7.0",
    clsx: "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.460.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
  },
  devDependencies: {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    typescript: "^5.6.0",
    vite: "^6.0.0",
    tailwindcss: "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "tw-animate-css": "^1.0.0",
  },
  engines: { node: ">=20" },
}, null, 2) + "\n");

/* ---------- 2. Vite + TS configs ---------- */
step("2/8", "Writing Vite + TS configs");

writeFileSync(join(ROOT, "vite.config.ts"), `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: Number(process.env.VITE_DEV_PORT ?? ${app.devPort}),
    strictPort: true,
  },
  preview: {
    port: Number(process.env.VITE_PREVIEW_PORT ?? ${app.previewPort}),
    strictPort: true,
  },
});
`);

writeFileSync(join(ROOT, "tsconfig.json"), JSON.stringify({
  files: [],
  references: [{ path: "./tsconfig.app.json" }, { path: "./tsconfig.node.json" }],
}, null, 2) + "\n");

writeFileSync(join(ROOT, "tsconfig.app.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2022",
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    module: "ESNext",
    jsx: "react-jsx",
    moduleResolution: "bundler",
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    skipLibCheck: true,
    esModuleInterop: true,
    allowImportingTsExtensions: true,
    noEmit: true,
    isolatedModules: true,
    baseUrl: ".",
    paths: { "@/*": ["./src/*"] },
  },
  include: ["src"],
}, null, 2) + "\n");

writeFileSync(join(ROOT, "tsconfig.node.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "bundler",
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    isolatedModules: true,
    types: ["node"],
  },
  include: ["vite.config.ts"],
}, null, 2) + "\n");

/* ---------- 3. index.html ---------- */
step("3/8", "Writing index.html");
writeFileSync(join(ROOT, "index.html"), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${app.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

/* ---------- 4. .env files ---------- */
step("4/8", "Writing .env + .env.example");
const envBody = `VITE_APP_NAME="${app.name}"
VITE_APP_ENV=prototype
VITE_DEV_PORT=${app.devPort}
VITE_PREVIEW_PORT=${app.previewPort}
VITE_MOCK_LATENCY_MS=400
VITE_MOCK_ERROR_RATE=0
VITE_DEFAULT_THEME=system
`;
writeFileSync(join(ROOT, ".env"), envBody);
writeFileSync(join(ROOT, ".env.example"), envBody);

/* ---------- 5. Copy templates → src/ ---------- */
step("5/8", "Copying templates/src → src/");
const SRC = join(ROOT, "src");
mkdirSync(SRC, { recursive: true });
cpSync(join(TEMPLATES, "src"), SRC, { recursive: true });

/* ---------- 6. Generate theme.css + docs ---------- */
step("6/8", "Generating theme.css + docs/");
const styleDir = join(SRC, "styles");
mkdirSync(styleDir, { recursive: true });

const brandLines = (colors.brand ?? [])
  .map((c, i) => {
    const name = (c.name ?? `accent-${i}`).toLowerCase().replace(/\s+/g, "-");
    return `    --brand-${name}: ${c.value};`;
  })
  .join("\n");

const fontVars = [
  typography.sans && `    --font-sans: ${typography.sans};`,
  typography.serif && `    --font-serif: ${typography.serif};`,
  typography.mono && `    --font-mono: ${typography.mono};`,
  typography.brand && `    --font-brand: ${typography.brand};`,
].filter(Boolean).join("\n");

writeFileSync(join(styleDir, "theme.css"), `/* Generated from prototype.config.json by scripts/bootstrap.mjs.
   Edit prototype.config.json and re-run bootstrap, or edit this file directly
   and keep docs/theme.md in sync. */

@layer base {
  :root {
    --primary: ${colors.primary.light};
    --primary-foreground: oklch(1 0 0);
${brandLines}
${fontVars}
    --font-heading: var(--font-${typography.heading});
    --radius: ${radius};
  }

  .dark {
    --primary: ${colors.primary.dark};
    --primary-foreground: oklch(0.145 0 0);
  }
}
`);

const docsDir = join(ROOT, "docs");
mkdirSync(docsDir, { recursive: true });
writeFileSync(join(docsDir, "theme.md"), `# Theme tokens

Generated from \`prototype.config.json\`. Source of truth for every visual token.

## Primary
- light: \`${colors.primary.light}\`
- dark: \`${colors.primary.dark}\`

## Radius
- \`--radius: ${radius}\` (${theme.radius})

## Style / icon library
- Style: ${theme.style}
- Icons: ${theme.iconLibrary}
`);

writeFileSync(join(docsDir, "components.md"), `# Components index

Per DESIGN.md §15, every component in a \`_components/\` folder ships a README.

## Shared
- \`src/components/empty-state.tsx\` — required empty state (DESIGN.md §7).
- \`src/components/app/sidebar.tsx\` — main nav.
- \`src/components/app/topbar.tsx\` — top app bar.
- \`src/components/app/theme-toggle.tsx\` — light/dark switch.
- \`src/components/app/theme-provider.tsx\` — \`.dark\` class manager + \`localStorage\`.
`);

/* ---------- 7. Install deps ---------- */
step("7/8", "Installing dependencies (this can take a minute)");
try {
  execSync("pnpm install", { cwd: ROOT, stdio: "inherit" });
} catch {
  fail("pnpm install failed. Make sure pnpm is installed: npm i -g pnpm");
}

/* ---------- 8. Shadcn components ---------- */
step("8/8", "Installing Shadcn components");

writeFileSync(join(ROOT, "components.json"), JSON.stringify({
  $schema: "https://ui.shadcn.com/schema.json",
  style: "new-york",
  rsc: false,
  tsx: true,
  tailwind: {
    config: "",
    css: "src/index.css",
    baseColor: "neutral",
    cssVariables: true,
    prefix: "",
  },
  aliases: {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/hooks",
  },
  iconLibrary: theme.iconLibrary.toLowerCase(),
}, null, 2) + "\n");

const components = [
  "button", "card", "dialog", "sheet", "alert", "alert-dialog",
  "input", "label", "select", "skeleton", "sonner", "badge", "avatar",
  "separator", "dropdown-menu", "table", "tabs", "textarea", "form",
];

try {
  execSync(`pnpm dlx shadcn@latest add ${components.join(" ")} --yes --overwrite`, {
    cwd: ROOT,
    stdio: "inherit",
  });
} catch {
  console.warn(`\n⚠ Shadcn add failed. Run manually:\n  pnpm dlx shadcn@latest add ${components.join(" ")}\n`);
}

console.log(`
${GREEN}✓ Bootstrap complete.${RESET}

  ${BOLD}Next:${RESET}  pnpm dev
  ${BOLD}URL:${RESET}   http://localhost:${app.devPort}

  ${DIM}Seed login:${RESET}
    email:    demo@boomkit.dev
    password: demo
`);
