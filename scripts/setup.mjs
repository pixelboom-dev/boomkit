#!/usr/bin/env node
/**
 * Boomkit interactive setup — zero dependencies, pure Node.js
 *
 * 1. Asks config questions (name, description, product type, theme)
 * 2. Writes prototype.config.json + patches DESIGN-RULES.md §0
 * 3. Runs pnpm bootstrap
 * 4. Applies theme tokens to src/index.css
 * 5. Scaffolds layout + router + home page for the chosen product type
 * 6. Starts pnpm dev
 */

import { createInterface }                       from "node:readline";
import { readFileSync, writeFileSync,
         mkdirSync, existsSync }                 from "node:fs";
import { execSync, spawn }                       from "node:child_process";
import { fileURLToPath }                         from "node:url";
import { dirname, join }                         from "node:path";
import { get as httpsGet }                       from "node:https";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// ─── ANSI ─────────────────────────────────────────────────────────────────────

const A = {
  reset:     "\x1b[0m",
  bold:      "\x1b[1m",
  dim:       "\x1b[2m",
  cyan:      "\x1b[36m",
  cyanBold:  "\x1b[1;36m",
  green:     "\x1b[32m",
  greenBold: "\x1b[1;32m",
  yellow:    "\x1b[33m",
  red:       "\x1b[31m",
  white:     "\x1b[97m",
  clear:     "\x1b[2J\x1b[H",
  up:        (n) => `\x1b[${n}A`,
  clearLine: "\x1b[2K\r",
};

const W = 62;

// ─── BOX DRAWING ──────────────────────────────────────────────────────────────

function pad(str, width) {
  const raw = str.replace(/\x1b\[[0-9;]*m/g, "");
  return str + " ".repeat(Math.max(0, width - raw.length));
}

function row(content = "") {
  process.stdout.write(`${A.dim}│${A.reset} ${pad(content, W)} ${A.dim}│${A.reset}\n`);
}

function divider(label = "") {
  if (label) {
    const l = label.replace(/\x1b\[[0-9;]*m/g, "").length;
    const right = W - 2 - l - 2;
    process.stdout.write(
      `${A.dim}├──${A.reset} ${label} ${A.dim}${"─".repeat(Math.max(0, right))  }┤${A.reset}\n`
    );
  } else {
    process.stdout.write(`${A.dim}├${"─".repeat(W + 2)}┤${A.reset}\n`);
  }
}

const topBorder    = () => process.stdout.write(`${A.dim}╭${"─".repeat(W + 2)}╮${A.reset}\n`);
const bottomBorder = () => process.stdout.write(`${A.dim}╰${"─".repeat(W + 2)}╯${A.reset}\n`);

// ─── HEADER ───────────────────────────────────────────────────────────────────

function printHeader() {
  process.stdout.write(A.clear);
  topBorder();
  row();
  for (const line of [
    " ██████╗  ██████╗  ██████╗ ███╗   ███╗██╗  ██╗██╗████████╗",
    " ██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║██║ ██╔╝██║╚══██╔══╝",
    " ██████╔╝██║   ██║██║   ██║██╔████╔██║█████╔╝ ██║   ██║   ",
    " ██╔══██╗██║   ██║██║   ██║██║╚██╔╝██║██╔═██╗ ██║   ██║   ",
    " ██████╔╝╚██████╔╝╚██████╔╝██║ ╚═╝ ██║██║  ██╗██║   ██║   ",
    " ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝   ",
  ]) row(`${A.cyanBold}${line}${A.reset}`);
  row();
  row(`${A.dim}  by Pixel Boom  ·  AI-native prototype kit${A.reset}`);
  row();
  bottomBorder();
  process.stdout.write("\n");
}

function section(n, label) {
  process.stdout.write("\n");
  divider(`${A.cyanBold}  ${n}  ${A.reset}${A.white} ${label} ${A.reset}`);
  process.stdout.write("\n");
}

// ─── TEXT INPUT ───────────────────────────────────────────────────────────────

async function prompt(question, defaultValue = "") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const hint = defaultValue ? `${A.dim} (${defaultValue})${A.reset}` : "";
  const answer = await new Promise((resolve) =>
    rl.question(`  ${A.white}◆${A.reset} ${question}${hint}${A.dim} › ${A.reset}`, resolve)
  );
  rl.close();
  return answer.trim() || defaultValue;
}

// ─── SELECT (arrow keys) ──────────────────────────────────────────────────────

async function select(question, options, defaultIndex = 0) {
  return new Promise((resolve) => {
    let current = defaultIndex;

    function render(first = false) {
      if (!first) process.stdout.write(A.up(options.length + 1) + A.clearLine);
      process.stdout.write(`  ${A.white}◆${A.reset} ${question}\n`);
      for (let i = 0; i < options.length; i++) {
        const sel = i === current;
        const cursor = sel ? `${A.cyanBold}  ❯ ${A.reset}` : "    ";
        const label  = sel ? `${A.cyanBold}${options[i].label}${A.reset}` : `${A.dim}${options[i].label}${A.reset}`;
        const hint   = options[i].hint ? `${A.dim}  ${options[i].hint}${A.reset}` : "";
        process.stdout.write(`${A.clearLine}${cursor}${label}${hint}\n`);
      }
    }

    render(true);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function onKey(key) {
      if      (key === "\x1b[A" || key === "k") { current = (current - 1 + options.length) % options.length; render(); }
      else if (key === "\x1b[B" || key === "j") { current = (current + 1) % options.length; render(); }
      else if (key === "\r" || key === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onKey);
        process.stdout.write(A.clearLine);
        process.stdout.write(`  ${A.green}◆${A.reset} ${question}  ${A.cyanBold}${options[current].label}${A.reset}\n`);
        resolve(options[current].value);
      } else if (key === "\x03") process.exit();
    }

    process.stdin.on("data", onKey);
  });
}

async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await prompt(question, hint);
  if (answer === hint) return defaultYes;
  return /^y/i.test(answer);
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────

function spinner(label) {
  const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  let i = 0;
  process.stdout.write("\n");
  const id = setInterval(() =>
    process.stdout.write(`\r  ${A.cyan}${frames[i++ % frames.length]}${A.reset}  ${A.dim}${label}${A.reset}   `), 80);
  return {
    succeed: (msg) => { clearInterval(id); process.stdout.write(`\r  ${A.greenBold}✓${A.reset}  ${A.white}${msg}${A.reset}\n`); },
    fail:    (msg) => { clearInterval(id); process.stdout.write(`\r  ${A.red}✗${A.reset}  ${A.red}${msg}${A.reset}\n`); },
  };
}

const info    = (msg) => process.stdout.write(`  ${A.dim}·  ${msg}${A.reset}\n`);
const success = (msg) => process.stdout.write(`\n  ${A.greenBold}✓${A.reset}  ${A.white}${msg}${A.reset}\n`);
const warn    = (msg) => process.stdout.write(`\n  ${A.yellow}!${A.reset}  ${A.yellow}${msg}${A.reset}\n`);
const die     = (msg) => { process.stdout.write(`\n  ${A.red}✗${A.reset}  ${A.red}${msg}${A.reset}\n`); process.exit(1); };

// ─── FETCH PRESET ─────────────────────────────────────────────────────────────

function fetchPreset(brand) {
  const url = `https://raw.githubusercontent.com/voltagent/awesome-design-md/main/design-md/${brand}/DESIGN.md`;
  return new Promise((resolve, reject) => {
    httpsGet(url, (res) => {
      if (res.statusCode === 404) return reject(new Error("not found"));
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function extractPresetTokens(markdown) {
  const tokens = {};

  // Primary color — hex near brand/primary/accent keywords
  const colorRe = [
    /(?:primary|brand|accent)[^\n`]*?`(#[0-9a-fA-F]{6})`/i,
    /`(#[0-9a-fA-F]{6})`[^\n`]*?(?:primary|brand|accent)/i,
    // First prominent hex that isn't black/white
    /`(#(?!(?:000000|ffffff|131313|1a1a1a|fafafa|f5f5f5)[^\w]))[0-9a-fA-F]{6}`/i,
  ];
  for (const re of colorRe) {
    const m = markdown.match(re);
    if (m) { tokens.primaryLight = m[1]; break; }
  }

  // Background color
  const bgM = markdown.match(/background[^\n`]*?`(#[0-9a-fA-F]{6})`/i);
  if (bgM) tokens.background = bgM[1];

  // Foreground / text color
  const fgM = markdown.match(/(?:foreground|text|body)[^\n`]*?`(#[0-9a-fA-F]{6})`/i);
  if (fgM) tokens.foreground = fgM[1];

  // Radius (explicit px or rem value near the word "radius")
  const rvM = markdown.match(/radius[^\n]*?(\d+(?:\.\d+)?(?:px|rem))/i);
  if (rvM) tokens.radiusValue = rvM[1];

  return tokens;
}

// ─── THEME APPLICATION ────────────────────────────────────────────────────────

const RADIUS_MAP = { Small: "0.25rem", Medium: "0.5rem", Large: "1rem", Full: "9999px" };

function applyTheme(config, tokens, srcDir) {
  const cssPath = join(srcDir, "index.css");
  if (!existsSync(cssPath)) return;

  let css = readFileSync(cssPath, "utf8");

  // Radius from config choice
  const rv = RADIUS_MAP[config.theme.radius] ?? "0.5rem";
  css = css.replace(/--radius:\s*[^;]+;/, `--radius: ${rv};`);

  // Colors from preset tokens
  if (tokens?.primaryLight) {
    css = css.replace(/(--primary:)\s*oklch\([^)]+\);/, `$1 ${tokens.primaryLight};`);
  }
  if (tokens?.background) {
    css = css.replace(/(--background:)\s*oklch\([^)]+\);/, `$1 ${tokens.background};`);
  }

  // Primary from manual config
  if (!tokens?.primaryLight && config.colors.primary.light !== "oklch(0.205 0 0)") {
    css = css.replace(/(--primary:)\s*oklch\([^)]+\);/, `$1 ${config.colors.primary.light};`);
  }
  // Dark mode primary
  const darkSection = css.match(/\.dark\s*\{([^}]+)\}/s)?.[0] ?? "";
  const patchedDark = darkSection.replace(/(--primary:)\s*oklch\([^)]+\);/, `$1 ${config.colors.primary.dark};`);
  css = css.replace(/\.dark\s*\{[^}]+\}/s, patchedDark);

  // Brand color token
  if (config.colors.brand?.length) {
    const brandVal = config.colors.brand[0].value;
    if (!css.includes("--brand-primary")) {
      css = css.replace("@layer base {", `@layer base {\n  :root { --brand-primary: ${brandVal}; }`);
    }
  }

  writeFileSync(cssPath, css);
}

// ─── PRODUCT-TYPE SCAFFOLDING ──────────────────────────────────────────────────

function scaffoldProductType(productType, config, srcDir) {
  if (productType === "saas-desktop") return; // templates already correct

  const appName = config.app.name;

  if (productType === "app") scaffoldApp(appName, srcDir);
  if (productType === "website") scaffoldWebsite(appName, srcDir);
}

// ── App scaffolding ───────────────────────────────────────────────────────────

function scaffoldApp(appName, srcDir) {
  writeFileSync(join(srcDir, "routes/_layout.tsx"), `import { Navigate, NavLink, Outlet } from "react-router-dom";
import { Home, Search, Bell, User } from "lucide-react";
import { useSession } from "@/hooks/use-session";

const TABS = [
  { to: "/",            icon: Home,   label: "Home",    end: true },
  { to: "/search",      icon: Search, label: "Search",  end: false },
  { to: "/alerts",      icon: Bell,   label: "Alerts",  end: false },
  { to: "/profile",     icon: User,   label: "Profile", end: false },
];

export function AppLayout() {
  const user = useSession((s) => s.user);
  if (!user) return <Navigate to="/signin" replace />;

  return (
    <div className="flex min-h-svh items-start justify-center bg-muted/40">
      <div className="relative flex h-svh w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-xl">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <nav className="flex shrink-0 border-t bg-background">
          {TABS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                \`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors \${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }\`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
`);

  writeFileSync(join(srcDir, "routes/_auth-layout.tsx"), `import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/hooks/use-session";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { t } from "@/lib/i18n";

export function AuthLayout() {
  const user = useSession((s) => s.user);
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-svh items-start justify-center bg-muted/40">
      <div className="relative flex h-svh w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-xl">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <p className="mb-8 text-lg font-semibold">{t("app.name")}</p>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
`);

  mkdirSync(join(srcDir, "routes/home"), { recursive: true });
  writeFileSync(join(srcDir, "routes/home/page.tsx"), `import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/mocks/api";
import { t } from "@/lib/i18n";

export default function HomePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["home-feed"],
    queryFn: () => api.listCustomers(),
  });

  return (
    <div className="flex flex-col gap-0">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <h1 className="text-base font-semibold">{t("nav.dashboard")}</h1>
      </header>

      <div className="flex flex-col gap-3 p-4">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}

        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              {t("common.loadError")}
              <Button size="sm" variant="ghost" onClick={() => refetch()}>{t("common.retry")}</Button>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState
            icon="inbox"
            title="Nothing here yet"
          />
        )}

        {!isLoading && !isError && data?.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {item.name.charAt(0)}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium leading-tight">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`);

  mkdirSync(join(srcDir, "routes/profile"), { recursive: true });
  writeFileSync(join(srcDir, "routes/profile/page.tsx"), `import { useSession } from "@/hooks/use-session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { t } from "@/lib/i18n";

export default function ProfilePage() {
  const { user, signOut } = useSession();

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <h1 className="text-base font-semibold">{t("nav.account")}</h1>
      </header>

      <div className="flex flex-col items-center gap-3 px-4 py-8">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-2xl">
            {user?.name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Separator />

      <div className="p-4">
        <Button variant="destructive" className="w-full" onClick={() => signOut()}>
          {t("nav.signOut")}
        </Button>
      </div>
    </div>
  );
}
`);

  writeFileSync(join(srcDir, "app/router.tsx"), `import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/routes/_layout";
import { AuthLayout } from "@/routes/_auth-layout";
import SignInPage from "@/routes/signin/page";
import HomePage from "@/routes/home/page";
import SettingsPage from "@/routes/settings/page";
import ProfilePage from "@/routes/profile/page";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/signin", element: <SignInPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "/",        element: <HomePage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/settings",element: <SettingsPage /> },
      { path: "/search",  element: <Navigate to="/" replace /> },
      { path: "/alerts",  element: <Navigate to="/" replace /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
`);
}

// ── Website scaffolding ───────────────────────────────────────────────────────

function scaffoldWebsite(appName, srcDir) {
  writeFileSync(join(srcDir, "routes/_layout.tsx"), `import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const NAV = [
  { to: "/about",   label: "About" },
  { to: "/blog",    label: "Blog" },
  { to: "/contact", label: "Contact" },
];

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="font-semibold">{t("app.name")}</Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Button asChild size="sm">
            <Link to="/signin">Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("app.name")}
      </footer>
    </div>
  );
}
`);

  mkdirSync(join(srcDir, "routes/home"), { recursive: true });
  writeFileSync(join(srcDir, "routes/home/page.tsx"), `import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";

const FEATURES = [
  { title: "Feature one",   body: "Short description of what this does and why it matters." },
  { title: "Feature two",   body: "Short description of what this does and why it matters." },
  { title: "Feature three", body: "Short description of what this does and why it matters." },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("app.name")}</h1>
        <p className="max-w-xl text-lg text-muted-foreground">{t("app.description")}</p>
        <div className="flex gap-3">
          <Button asChild size="lg"><Link to="/signin">Get started</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/about">Learn more</Link></Button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader><CardTitle className="text-base">{f.title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{f.body}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
`);

  writeFileSync(join(srcDir, "app/router.tsx"), `import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/routes/_layout";
import { AuthLayout } from "@/routes/_auth-layout";
import SignInPage from "@/routes/signin/page";
import HomePage from "@/routes/home/page";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/signin", element: <SignInPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
`);
}

// ─── PATCH i18n ───────────────────────────────────────────────────────────────

function patchI18n(config, srcDir) {
  const i18nPath = join(srcDir, "lib/i18n.ts");
  if (!existsSync(i18nPath)) return;

  let src = readFileSync(i18nPath, "utf8");

  const inject = (key, value) => {
    if (!src.includes(`"${key}"`)) {
      src = src.replace(`"app.name"`, `"app.name": import.meta.env.VITE_APP_NAME || "${config.app.name}",\n  "app.description": import.meta.env.VITE_APP_DESCRIPTION || "${config.app.description ?? ""}",`);
    }
  };

  inject("app.description", config.app.description ?? "");

  // Replace the app.name line to embed the actual name
  src = src.replace(
    /("app\.name":\s*import\.meta\.env\.VITE_APP_NAME \|\| ")[^"]*(")/,
    `$1${config.app.name}$2`
  );

  writeFileSync(i18nPath, src);
}

// ─── CONFIG & DESIGN-RULES ────────────────────────────────────────────────────

function writeConfig(config) {
  writeFileSync(join(ROOT, "prototype.config.json"), JSON.stringify(config, null, 2) + "\n");
}

function patchDesignRules(config) {
  const path = join(ROOT, "DESIGN-RULES.md");
  if (!existsSync(path)) return;
  let md = readFileSync(path, "utf8");
  md = md.replace(/(\*\*Primary\*\*\s*\|)[^\n]*/, `$1 \`${config.colors.primary.light}\` | \`${config.colors.primary.dark}\``);
  md = md.replace(/(\*\*Product type\*\*\s*\|)[^\n]*/, `$1 \`${config.app.productType}\` | SaaS desktop · Website · App`);
  md = md.replace(/(\*\*Style\*\*\s*\|)[^\n]*/, `$1 \`${config.theme.style}\` | Vega · Nova · Maia · Lyra · Mira · Luma · Sera · Rhea`);
  md = md.replace(/(\*\*Radius\*\*\s*\|)[^\n]*/, `$1 \`${config.theme.radius}\` | Small · Medium · Large · Full`);
  writeFileSync(path, md);
}

// ─── SUMMARY + HAND-OFF ───────────────────────────────────────────────────────

function printSummary(config) {
  process.stdout.write("\n");
  topBorder();
  row(`${A.white} Configuration summary${A.reset}`);
  divider();
  row(`${A.dim} App name${A.reset}     ${A.cyanBold}${config.app.name}${A.reset}`);
  if (config.app.description) row(`${A.dim} Description${A.reset}  ${A.cyanBold}${config.app.description}${A.reset}`);
  row(`${A.dim} Product${A.reset}      ${A.cyanBold}${config.app.productType}${A.reset}`);
  row(`${A.dim} Primary ☀${A.reset}   ${A.cyanBold}${config.colors.primary.light}${A.reset}`);
  row(`${A.dim} Primary ☾${A.reset}   ${A.cyanBold}${config.colors.primary.dark}${A.reset}`);
  if (config.colors.brand?.length) row(`${A.dim} Brand${A.reset}        ${A.cyanBold}${config.colors.brand[0].value}${A.reset}`);
  row(`${A.dim} Style${A.reset}        ${A.cyanBold}${config.theme.style}${A.reset}`);
  row(`${A.dim} Radius${A.reset}       ${A.cyanBold}${config.theme.radius}${A.reset}`);
  row();
  bottomBorder();
}

function printHandoff(port) {
  process.stdout.write("\n");
  topBorder();
  row();
  row(`${A.greenBold} ✓  Setup complete${A.reset}`);
  row();
  divider();
  row();
  row(`${A.white} Running at${A.reset}   ${A.cyanBold}http://localhost:${port}${A.reset}`);
  row();
  row(`${A.white} Seed login${A.reset}`);
  row(`${A.dim}   email     ${A.reset}${A.cyanBold}demo@boomkit.dev${A.reset}`);
  row(`${A.dim}   password  ${A.reset}${A.cyanBold}demo${A.reset}`);
  row();
  divider();
  row();
  row(`${A.white} Next: open this folder in your AI editor and say:${A.reset}`);
  row();
  row(`   ${A.cyanBold}start boomkit${A.reset}`);
  row();
  row(`${A.dim} The agent will evolve your screens from this baseline.${A.reset}`);
  row();
  bottomBorder();
  process.stdout.write("\n");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  printHeader();

  // ── 1. Identity ─────────────────────────────────────────────────────────────
  section("1 / 3", "Your prototype");

  const appName      = await prompt("App name", "My SaaS");
  const description  = await prompt("Short description — what does it do?", "");

  const productType  = await select("Product type", [
    { value: "saas-desktop", label: "SaaS desktop", hint: "sidebar · dashboard · CRUD · settings" },
    { value: "website",      label: "Website",       hint: "hero · blog · pricing · contact" },
    { value: "app",          label: "App",            hint: "mobile-first · 430 px viewport · bottom tabs" },
  ]);

  // ── 2. Theme ─────────────────────────────────────────────────────────────────
  section("2 / 3", "Theme");

  let primaryLight = "oklch(0.205 0 0)";
  let primaryDark  = "oklch(0.985 0 0)";
  let radius       = "Medium";
  let style        = "Vega";
  let brandColor   = "";
  let presetTokens = null;

  const themeMode = await select("How do you want to configure the theme?", [
    { value: "preset", label: "Use a preset", hint: "brand palette from awesome-design-md" },
    { value: "manual", label: "Configure manually" },
  ]);

  if (themeMode === "preset") {
    const brandName = await prompt(
      `Brand name — see github.com/voltagent/awesome-design-md${A.reset}${A.dim}\n    e.g. linear, vercel, stripe, theverge, apple, tesla`,
      ""
    );
    if (brandName) {
      const spin = spinner(`Fetching ${brandName} palette…`);
      try {
        const markdown = await fetchPreset(brandName.toLowerCase().replace(/\s+/g, ""));
        presetTokens   = extractPresetTokens(markdown);
        spin.succeed(`Preset applied: ${brandName}`);
        if (presetTokens.primaryLight) { primaryLight = presetTokens.primaryLight; info(`  Primary: ${primaryLight}`); }
        if (presetTokens.radiusValue)  { info(`  Radius value extracted: ${presetTokens.radiusValue} (mapped to nearest)`); }
        process.stdout.write("\n");
      } catch {
        spin.fail(`Preset "${brandName}" not found — using manual config instead.`);
        presetTokens = null;
      }
    }

    const override = await confirm("Override any preset value?", false);
    if (override) {
      primaryLight = await prompt("Primary color — light mode", primaryLight);
      primaryDark  = await prompt("Primary color — dark mode", primaryDark);
      radius = await select("Radius", [
        { value: "Small", label: "Small" }, { value: "Medium", label: "Medium" },
        { value: "Large", label: "Large" }, { value: "Full",   label: "Full" },
      ], ["Small","Medium","Large","Full"].indexOf(radius) < 0 ? 1 : ["Small","Medium","Large","Full"].indexOf(radius));
    }
  } else {
    primaryLight = await prompt("Primary color — light mode (hex or oklch)", primaryLight);
    primaryDark  = await prompt("Primary color — dark mode  (hex or oklch)", primaryDark);
    brandColor   = await prompt("Brand color — optional (hex, or Enter to skip)", "");
    style        = await select("Style", [
      { value: "Vega", label: "Vega" }, { value: "Nova", label: "Nova" },
      { value: "Maia", label: "Maia" }, { value: "Lyra", label: "Lyra" },
      { value: "Mira", label: "Mira" }, { value: "Luma", label: "Luma" },
      { value: "Sera", label: "Sera" }, { value: "Rhea", label: "Rhea" },
    ]);
    radius       = await select("Radius", [
      { value: "Small", label: "Small" }, { value: "Medium", label: "Medium" },
      { value: "Large", label: "Large" }, { value: "Full",   label: "Full" },
    ], 1);
  }

  // ── 3. Confirm ───────────────────────────────────────────────────────────────
  section("3 / 3", "Ready");

  const config = {
    app: { name: appName, description, productType, devPort: 9900, previewPort: 9901 },
    colors: {
      primary: { light: primaryLight, dark: primaryDark },
      brand: brandColor ? [{ name: "brand-primary", value: brandColor }] : [],
    },
    typography: { sans: null, serif: null, mono: null, brand: null, heading: "sans", body: "sans" },
    theme: { style, iconLibrary: "Lucide", radius },
  };

  printSummary(config);

  const go = await confirm("Bootstrap the prototype with these settings?");
  if (!go) { warn("Aborted. Run pnpm start again to restart."); process.exit(0); }

  writeConfig(config);
  patchDesignRules(config);
  success("prototype.config.json written");

  // Bootstrap
  process.stdout.write("\n");
  const bSpin = spinner("Running pnpm bootstrap…");
  try {
    execSync("pnpm bootstrap", {
      cwd: ROOT, stdio: "pipe",
      env: { ...process.env, CI: "1", npm_config_yes: "true", FORCE_COLOR: "0" },
    });
    bSpin.succeed("Bootstrap complete");
  } catch (e) {
    bSpin.fail("Bootstrap failed");
    process.stdout.write(`${A.dim}${e.stderr?.toString() ?? e.message}${A.reset}\n`);
    die("Fix the error above and re-run pnpm bootstrap manually.");
  }

  const SRC = join(ROOT, "src");

  // Apply theme to CSS
  const tSpin = spinner("Applying theme…");
  applyTheme(config, presetTokens, SRC);
  tSpin.succeed("Theme applied to src/index.css");

  // Scaffold product-type screens
  const sSpin = spinner(`Scaffolding ${productType} screens…`);
  scaffoldProductType(productType, config, SRC);
  patchI18n(config, SRC);
  sSpin.succeed("Screens scaffolded");

  // Start dev server
  const dSpin = spinner("Starting dev server…");
  const dev = spawn("pnpm", ["dev"], {
    cwd: ROOT, detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  await new Promise((resolve) => {
    dev.stdout.on("data", (d) => { if (d.toString().includes("localhost")) resolve(); });
    setTimeout(resolve, 9000);
  });
  dev.unref();

  dSpin.succeed(`Dev server running  →  http://localhost:${config.app.devPort}`);
  printHandoff(config.app.devPort);
}

main().catch((e) => {
  process.stdout.write(`\n${A.red}✗${A.reset}  Unexpected error: ${e.message}\n`);
  process.exit(1);
});
