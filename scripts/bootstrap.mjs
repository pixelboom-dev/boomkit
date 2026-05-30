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
};
const runQuiet = (cmd) =>
  execSync(cmd, { cwd: ROOT, stdio: "inherit", env: NON_INTERACTIVE_ENV });
// For shadcn CLI: even with --yes, certain setup prompts (e.g. "create
// components.json?") still appear. Pipe `yes` to cover anything we miss.
const runShadcn = (cmd) =>
  execSync(`yes | ${cmd}`, {
    cwd: ROOT,
    stdio: ["pipe", "inherit", "inherit"],
    env: NON_INTERACTIVE_ENV,
    shell: "/bin/sh",
  });

if (!existsSync(CONFIG_PATH)) {
  fail(`prototype.config.json not found.
  Run:  cp prototype.config.example.json prototype.config.json
  Then edit it and re-run: pnpm bootstrap`);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const { app } = config;
const productType = app.productType ?? "saas-desktop";

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
VITE_APP_DESCRIPTION="${app.description ?? ""}"
VITE_APP_ENV=prototype
VITE_PRODUCT_TYPE=${productType}
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

// Pre-write the three files shadcn init is *supposed* to create, so that
// even if init silently exits without doing its job (which happens in
// existing directories with `--template vite`), `shadcn add` still finds
// what it needs and never prompts "create components.json?".
// Init, when successful, will overwrite these with the preset's values.

const utilsPath = join(SRC, "lib", "utils.ts");
mkdirSync(join(SRC, "lib"), { recursive: true });
if (!existsSync(utilsPath)) {
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

const indexCss = join(SRC, "index.css");
if (!existsSync(indexCss)) {
  writeFileSync(
    indexCss,
    `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@layer base {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --radius: 0.625rem;
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.708 0 0);
  }
  .dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
  }
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`,
  );
}

const componentsJson = join(ROOT, "components.json");
if (!existsSync(componentsJson)) {
  writeFileSync(
    componentsJson,
    JSON.stringify(
      {
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
        iconLibrary: "lucide",
      },
      null,
      2,
    ) + "\n",
  );
}

const initCmd = `pnpm dlx shadcn@latest init --preset ${SHADCN_PRESET} --template vite --pointer --yes --overwrite`;
try {
  runShadcn(initCmd);
} catch {
  warn("shadcn init with preset failed; trying plain init as fallback");
  try {
    runShadcn(`pnpm dlx shadcn@latest init --yes --overwrite --base-color neutral`);
  } catch {
    warn("shadcn init failed. Using the pre-written defaults — theme will be");
    warn("the minimal Boomkit baseline, not the preset. Re-run init manually");
    warn(`if you want the preset theme:  ${initCmd}`);
  }
}

// shadcn init may overwrite tsconfig.json without our paths — re-patch.
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
  runShadcn(`pnpm dlx shadcn@latest add ${components.join(" ")} --yes --overwrite`);
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

Per DESIGN-RULES.md §15, every component in a \`_components/\` folder ships a README.

## Shared
- \`src/components/empty-state.tsx\` — required empty state (DESIGN-RULES.md §7).
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

  ${BOLD}Product type:${RESET}  ${productType}
  ${BOLD}Next:${RESET}          pnpm dev
  ${BOLD}URL:${RESET}           http://localhost:${app.devPort}

  ${DIM}Seed login:${RESET}
    email:    demo@boomkit.dev
    password: demo

  ${DIM}The agent will now scaffold screens for: ${productType}${RESET}
`);
