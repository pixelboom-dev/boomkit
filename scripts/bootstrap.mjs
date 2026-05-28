#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  existsSync,
  rmSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = join(ROOT, "prototype.config.json");
const TEMPLATES = join(ROOT, "templates");

const BOLD = "\x1b[1m",
  DIM = "\x1b[2m",
  RED = "\x1b[31m",
  GREEN = "\x1b[32m",
  YELLOW = "\x1b[33m",
  RESET = "\x1b[0m";
const step = (n, msg) => console.log(`${BOLD}▸ [${n}]${RESET} ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}!${RESET} ${msg}`);
const fail = (msg) => {
  console.error(`${RED}✗${RESET} ${msg}`);
  process.exit(1);
};

// Auto-confirm every prompt from pnpm dlx, shadcn CLI, and anything that
// honors CI=1 or npm_config_yes. The workshop must run end-to-end without
// human input — manual review happens in the editor afterwards.
const NON_INTERACTIVE_ENV = {
  ...process.env,
  CI: "1",
  npm_config_yes: "true",
  FORCE_COLOR: "1",
};
const runQuiet = (cmd) =>
  execSync(cmd, { cwd: ROOT, stdio: "inherit", env: NON_INTERACTIVE_ENV });

if (!existsSync(CONFIG_PATH)) {
  fail(`prototype.config.json not found.
  Run:  cp prototype.config.example.json prototype.config.json
  Then edit it and re-run: pnpm bootstrap`);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const { app } = config;

// The Shadcn preset that ships the default Boomkit theme.
// Documented at: pnpm dlx shadcn@latest init --preset b27GcrRo --template vite --pointer
const SHADCN_PRESET = "b27GcrRo";

/* ---------- 1. package.json ---------- */
step("1/9", "Writing package.json");
writeFileSync(
  join(ROOT, "package.json"),
  JSON.stringify(
    {
      name: app.name.toLowerCase().replace(/\s+/g, "-"),
      private: true,
      type: "module",
      scripts: {
        start: "node scripts/kickoff.mjs",
        bootstrap: "node scripts/bootstrap.mjs",
        reset: "node scripts/reset.mjs",
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
        recharts: "^2.13.0",
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
    },
    null,
    2,
  ) + "\n",
);

/* ---------- 2. Vite + TS configs ---------- */
step("2/9", "Writing Vite + TS configs");

writeFileSync(
  join(ROOT, "vite.config.ts"),
  `import { defineConfig } from "vite";
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
`,
);

writeFileSync(
  join(ROOT, "tsconfig.json"),
  JSON.stringify(
    {
      files: [],
      references: [{ path: "./tsconfig.app.json" }, { path: "./tsconfig.node.json" }],
      // Root paths required so Shadcn CLI resolves `@/*` correctly.
      compilerOptions: {
        baseUrl: ".",
        paths: { "@/*": ["./src/*"] },
      },
    },
    null,
    2,
  ) + "\n",
);

writeFileSync(
  join(ROOT, "tsconfig.app.json"),
  JSON.stringify(
    {
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
    },
    null,
    2,
  ) + "\n",
);

writeFileSync(
  join(ROOT, "tsconfig.node.json"),
  JSON.stringify(
    {
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
    },
    null,
    2,
  ) + "\n",
);

/* ---------- 3. index.html ---------- */
step("3/9", "Writing index.html");
writeFileSync(
  join(ROOT, "index.html"),
  `<!doctype html>
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
`,
);

/* ---------- 4. .env ---------- */
step("4/9", "Writing .env + .env.example");
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
step("5/9", "Copying templates/src → src/");
const SRC = join(ROOT, "src");
mkdirSync(SRC, { recursive: true });
cpSync(join(TEMPLATES, "src"), SRC, { recursive: true });

/* ---------- 6. Install deps ---------- */
step("6/9", "Installing dependencies (this can take a minute)");
try {
  runQuiet("pnpm install");
} catch {
  fail("pnpm install failed. Make sure pnpm is installed: npm i -g pnpm");
}

/* ---------- 7. Shadcn init with preset ---------- */
step("7/9", `Running shadcn init (preset ${SHADCN_PRESET})`);

// Defensive: nuke any literal @/ folder a previous broken run may have left.
const literalAt = join(ROOT, "@");
if (existsSync(literalAt)) {
  warn("removing stale literal @/ folder from a previous run");
  rmSync(literalAt, { recursive: true, force: true });
}

const initCmd = `pnpm dlx shadcn@latest init --preset ${SHADCN_PRESET} --template vite --pointer --yes --overwrite`;
try {
  runQuiet(initCmd);
} catch {
  warn("shadcn init with preset failed; trying plain init as fallback");
  try {
    runQuiet(`pnpm dlx shadcn@latest init --yes --overwrite --base-color neutral`);
  } catch {
    warn("shadcn init still failed. You may need to run it manually:");
    warn(`  ${initCmd}`);
  }
}

// shadcn init may have overwritten tsconfig.json without our paths — re-patch.
const tsRoot = JSON.parse(readFileSync(join(ROOT, "tsconfig.json"), "utf8"));
if (!tsRoot.compilerOptions?.paths?.["@/*"]) {
  warn("re-patching tsconfig.json paths (shadcn init dropped them)");
  tsRoot.compilerOptions = {
    ...(tsRoot.compilerOptions ?? {}),
    baseUrl: ".",
    paths: { "@/*": ["./src/*"] },
  };
  writeFileSync(join(ROOT, "tsconfig.json"), JSON.stringify(tsRoot, null, 2) + "\n");
}

// Defensive: ensure src/lib/utils.ts exists (cn helper). shadcn init normally
// creates it, but if init was skipped or failed we write a minimal version.
const utilsPath = join(SRC, "lib", "utils.ts");
if (!existsSync(utilsPath)) {
  warn("src/lib/utils.ts missing — writing minimal cn() helper");
  mkdirSync(join(SRC, "lib"), { recursive: true });
  writeFileSync(
    utilsPath,
    `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
  );
}

// Defensive: ensure src/index.css exists with Tailwind + dark variant.
const indexCss = join(SRC, "index.css");
if (!existsSync(indexCss)) {
  warn("src/index.css missing — writing minimal Tailwind entry");
  writeFileSync(
    indexCss,
    `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));
`,
  );
}

/* ---------- 8. Shadcn components ---------- */
step("8/9", "Adding Shadcn components");
const components = [
  // primitives
  "button", "card", "dialog", "sheet", "alert", "alert-dialog",
  "input", "label", "select", "skeleton", "sonner", "badge", "avatar",
  "separator", "dropdown-menu", "table", "tabs", "textarea", "form",
  // polished compositions
  "sidebar", "chart", "breadcrumb", "collapsible", "tooltip", "toggle-group",
];
try {
  runQuiet(`pnpm dlx shadcn@latest add ${components.join(" ")} --yes --overwrite`);
} catch {
  warn(`shadcn add failed. Run manually: pnpm dlx shadcn@latest add ${components.join(" ")}`);
}

/* ---------- 9. docs/ ---------- */
step("9/9", "Generating docs/");
const docsDir = join(ROOT, "docs");
mkdirSync(docsDir, { recursive: true });
writeFileSync(
  join(docsDir, "theme.md"),
  `# Theme

Theme is owned by the Shadcn preset \`${SHADCN_PRESET}\` (applied during \`pnpm bootstrap\`).
Override tokens by editing \`src/index.css\` and document the change here.

## Default base
- Style: new-york
- Radius: see CSS \`--radius\` token in \`src/index.css\`
- Colors: see \`:root\` and \`.dark\` blocks in \`src/index.css\`
`,
);
writeFileSync(
  join(docsDir, "components.md"),
  `# Components index

Per DESIGN.md §15, every component in a \`_components/\` folder ships a README.

## Shared
- \`src/components/empty-state.tsx\` — required empty state (DESIGN.md §7).
- \`src/components/app/sidebar.tsx\` — AppSidebar composition (inset variant).
- \`src/components/app/nav-main.tsx\` — primary CTA + main nav items.
- \`src/components/app/nav-secondary.tsx\` — secondary nav pushed to \`mt-auto\`.
- \`src/components/app/nav-user.tsx\` — user dropdown in SidebarFooter.
- \`src/components/app/site-header.tsx\` — header with SidebarTrigger + title.
- \`src/components/app/theme-toggle.tsx\` — light/dark switch.
- \`src/components/app/theme-provider.tsx\` — \`.dark\` class manager + \`localStorage\`.
`,
);

console.log(`
${GREEN}✓ Bootstrap complete.${RESET}

  ${BOLD}Next:${RESET}  pnpm dev
  ${BOLD}URL:${RESET}   http://localhost:${app.devPort}

  ${DIM}Seed login:${RESET}
    email:    demo@boomkit.dev
    password: demo
`);
