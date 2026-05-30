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
  // ── helpers ────────────────────────────────────────────────────────────────
  const chromaticity = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return Math.max(r, g, b) - Math.min(r, g, b); // 0 = gray, 255 = vivid
  };

  // collect every hex in the doc — handles `#xxxxxx` and "#xxxxxx" and plain #xxxxxx in tables
  const allHex = [...markdown.matchAll(/(?:`|"|^|\s|:|\|)(#[0-9a-fA-F]{6})(?:`|"|$|\s|;|\|)/gm)]
    .map((m) => m[1].toLowerCase());

  // ── 1. YAML / structured format: `primary: "#5e6ad2"` ─────────────────────
  const yamlPrimary = markdown.match(/^\s*primary:\s*["']?(#[0-9a-fA-F]{6})["']?/im);
  const yamlCanvas  = markdown.match(/^\s*(?:canvas|background|bg):\s*["']?(#[0-9a-fA-F]{6})["']?/im);
  const yamlSurface = markdown.match(/^\s*surface[-_]?1?:\s*["']?(#[0-9a-fA-F]{6})["']?/im);

  if (yamlPrimary) {
    return {
      primaryLight: yamlPrimary[1],
      background:   yamlCanvas?.[1] ?? yamlSurface?.[1] ?? null,
    };
  }

  // ── 2. Keyword-adjacent search for prose format ───────────────────────────
  const KEYWORDS = ["primary", "brand", "accent", "signature", "highlight", "cta"];
  let primaryLight = null;

  for (const kw of KEYWORDS) {
    // keyword then hex  (up to 120 chars apart)
    const a = markdown.match(new RegExp(`${kw}[^\\n]{0,120}(?:\`|["'])(#[0-9a-fA-F]{6})(?:\`|["'])`, "i"));
    if (a && chromaticity(a[1]) > 30) { primaryLight = a[1]; break; }
    // hex then keyword
    const b = markdown.match(new RegExp(`(?:\`|["'])(#[0-9a-fA-F]{6})(?:\`|["'])[^\\n]{0,120}${kw}`, "i"));
    if (b && chromaticity(b[1]) > 30) { primaryLight = b[1]; break; }
  }

  // ── 3. Fallback: most-chromatic hex in the doc ────────────────────────────
  if (!primaryLight) {
    const chromatic = allHex.filter((h) => chromaticity(h) > 40);
    if (chromatic.length) {
      primaryLight = chromatic.sort((a, b) => chromaticity(b) - chromaticity(a))[0];
    }
  }

  // ── 4. Background (canvas / background keyword) ───────────────────────────
  const bgM = markdown.match(/(?:canvas|background)[^\n]{0,60}(?:`|["'])(#[0-9a-fA-F]{6})(?:`|["'])/i);
  const background = bgM?.[1] ?? null;

  return { primaryLight, background };
}

// ─── THEME APPLICATION ────────────────────────────────────────────────────────

const RADIUS_MAP = { Small: "0.25rem", Medium: "0.5rem", Large: "1rem", Full: "9999px" };

/**
 * Patch a single CSS custom property inside a CSS block string.
 * Handles any value format (oklch, hex, rem, etc).
 */
function patchVar(block, name, value) {
  // matches `--name: <anything up to ; or newline>`
  const re = new RegExp(`(${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*)[^;\\n}]+`);
  return block.replace(re, `$1${value}`);
}

function applyTheme(config, tokens, srcDir) {
  const cssPath = join(srcDir, "index.css");
  if (!existsSync(cssPath)) return { applied: [] };

  let css = readFileSync(cssPath, "utf8");
  const applied = [];

  const primaryLight = tokens?.primaryLight ?? config.colors.primary.light;
  const primaryDark  = config.colors.primary.dark;
  const radiusVal    = RADIUS_MAP[config.theme.radius] ?? "0.5rem";

  // ── patch :root block ─────────────────────────────────────────────────────
  css = css.replace(/:root\s*\{[^}]+\}/s, (block) => {
    let b = block;
    b = patchVar(b, "--primary", primaryLight);
    b = patchVar(b, "--radius",  radiusVal);
    if (tokens?.background) b = patchVar(b, "--background", tokens.background);
    return b;
  });
  applied.push(`--primary (light): ${primaryLight}`);
  applied.push(`--radius: ${radiusVal}`);
  if (tokens?.background) applied.push(`--background: ${tokens.background}`);

  // ── patch .dark block ─────────────────────────────────────────────────────
  css = css.replace(/\.dark\s*\{[^}]+\}/s, (block) => patchVar(block, "--primary", primaryDark));
  applied.push(`--primary (dark): ${primaryDark}`);

  // ── brand color ───────────────────────────────────────────────────────────
  if (config.colors.brand?.length) {
    const brandVal = config.colors.brand[0].value;
    if (!css.includes("--brand-primary")) {
      css = css.replace("@layer base {", `@layer base {\n  :root { --brand-primary: ${brandVal}; }`);
      applied.push(`--brand-primary: ${brandVal}`);
    }
  }

  writeFileSync(cssPath, css);
  return { applied };
}

// ─── PRODUCT-TYPE SCAFFOLDING ──────────────────────────────────────────────────

function scaffoldProductType(productType, config, srcDir) {
  const appName = config.app.name;

  if (productType === "saas-desktop") scaffoldSaas(srcDir);
  if (productType === "website")      scaffoldWebsite(appName, config.app.description, srcDir);
  if (productType === "app")          scaffoldApp(appName, srcDir);
}

// ── SaaS scaffold ─────────────────────────────────────────────────────────────

function scaffoldSaas(srcDir) {
  // Customers: single page with Sheet drawer for create + edit
  writeFileSync(join(srcDir, "routes/customers/page.tsx"), `import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField,
  FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/mocks/api";
import type { Customer } from "@/mocks/db";
import { t } from "@/lib/i18n";

const schema = z.object({
  name:   z.string().min(1, "Name is required"),
  status: z.enum(["active", "inactive"]),
});
type FormValues = z.infer<typeof schema>;

export default function CustomersPage() {
  const qc = useQueryClient();
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [editing,         setEditing]         = useState<Customer | null>(null);
  const [deletingId,      setDeletingId]      = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn:  api.listCustomers,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", status: "active" },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.createCustomer(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(t("customers.toast.created"));
      closeDrawer();
    },
    onError: () => toast.error(t("common.saveError")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FormValues }) =>
      api.updateCustomer(id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(t("customers.toast.updated"));
      closeDrawer();
    },
    onError: () => toast.error(t("common.saveError")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(t("customers.toast.deleted"));
      setDeletingId(null);
    },
    onError: () => toast.error(t("common.saveError")),
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", status: "active" });
    setDrawerOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    form.reset({ name: customer.name, status: customer.status });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
    form.reset();
  }

  function onSubmit(values: FormValues) {
    if (editing) updateMutation.mutate({ id: editing.id, values });
    else         createMutation.mutate(values);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate}>{t("customers.add")}</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-2">
            {t("common.loadError")}
            <Button size="sm" variant="outline" onClick={() => refetch()}>{t("common.retry")}</Button>
          </AlertDescription>
        </Alert>
      ) : !data?.length ? (
        <EmptyState icon={Users} title={t("customers.empty.title")}
          action={{ label: t("customers.empty.cta"), onClick: openCreate }} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customers.column.name")}</TableHead>
                <TableHead>{t("customers.column.status")}</TableHead>
                <TableHead>{t("customers.column.createdAt")}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>
                      {t(\`customers.status.\${c.status}\`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.createdAt}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost"
                        onClick={() => setDeletingId(c.id)}
                        className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) closeDrawer(); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editing ? t("customers.detail.edit") : t("customers.new.title")}
            </SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 px-4 py-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("customers.column.name")}</FormLabel>
                  <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("customers.column.status")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">{t("customers.status.active")}</SelectItem>
                      <SelectItem value="inactive">{t("customers.status.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <SheetFooter className="mt-auto">
                <Button type="button" variant="ghost" onClick={closeDrawer}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={isSaving}>{t("common.save")}</Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("customers.detail.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("customers.detail.deleteConfirm.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
`);

  // Slim router — no sub-routes for customers
  writeFileSync(join(srcDir, "app/router.tsx"), `import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout }  from "@/routes/_layout";
import { AuthLayout } from "@/routes/_auth-layout";
import SignInPage      from "@/routes/signin/page";
import SignUpPage      from "@/routes/signup/page";
import DashboardPage   from "@/routes/dashboard/page";
import CustomersPage   from "@/routes/customers/page";
import SettingsPage    from "@/routes/settings/page";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/signin", element: <SignInPage /> },
      { path: "/signup", element: <SignUpPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "/",          element: <DashboardPage /> },
      { path: "/customers", element: <CustomersPage /> },
      { path: "/settings",  element: <SettingsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
`);
}

// ── Website scaffold ──────────────────────────────────────────────────────────

function scaffoldWebsite(appName, description, srcDir) {
  // Layout: sticky navbar + footer wrapper
  writeFileSync(join(srcDir, "routes/_layout.tsx"), `import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const NAV_LINKS = [
  { to: "/#features", label: "Features" },
  { to: "/#pricing",  label: "Pricing" },
  { to: "/#about",    label: "About" },
];

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            {t("app.name")}
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {NAV_LINKS.map(({ to, label }) => (
              <a key={to} href={to}
                className="text-muted-foreground transition-colors hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signin">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-10 md:flex-row md:justify-between">
          <p className="font-semibold">{t("app.name")}</p>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            {NAV_LINKS.map(({ to, label }) => (
              <a key={to} href={to} className="hover:text-foreground transition-colors">{label}</a>
            ))}
          </nav>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {t("app.name")}
          </p>
        </div>
      </footer>
    </div>
  );
}
`);

  // Homepage: Hero + Features + Pricing sections
  mkdirSync(join(srcDir, "routes/home"), { recursive: true });
  const desc = description || "The fastest way to ship your idea.";
  writeFileSync(join(srcDir, "routes/home/page.tsx"), `import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { t } from "@/lib/i18n";

const FEATURES = [
  {
    title: "Feature one",
    description: "Describe the core value this feature delivers to your users.",
  },
  {
    title: "Feature two",
    description: "Keep it concrete: what problem does it solve, and how fast.",
  },
  {
    title: "Feature three",
    description: "One sentence per feature. No filler words.",
  },
  {
    title: "Feature four",
    description: "Focus on outcomes, not implementation details.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    description: "Good for personal projects",
    features: ["Up to 3 projects", "Basic analytics", "Community support"],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For growing teams",
    features: ["Unlimited projects", "Advanced analytics", "Priority support", "Custom domain"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organisations",
    features: ["Everything in Pro", "SSO & audit log", "SLA", "Dedicated support"],
    cta: "Contact us",
    highlight: false,
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-24 text-center md:py-32">
        <Badge variant="secondary">Now in public beta</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          {t("app.name")}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          ${desc}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/signin">Get started for free</Link></Button>
          <Button asChild size="lg" variant="outline">
            <a href="#features">See how it works</a>
          </Button>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="border-t py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything you need</h2>
            <p className="mt-2 text-muted-foreground">Built for teams that move fast.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-0 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t bg-muted/40 py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Simple pricing</h2>
            <p className="mt-2 text-muted-foreground">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <Card key={plan.name}
                className={plan.highlight ? "border-primary shadow-md" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.highlight && <Badge>Popular</Badge>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full"
                    variant={plan.highlight ? "default" : "outline"}>
                    <Link to="/signin">{plan.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
`);

  writeFileSync(join(srcDir, "app/router.tsx"), `import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout }  from "@/routes/_layout";
import { AuthLayout } from "@/routes/_auth-layout";
import SignInPage      from "@/routes/signin/page";
import HomePage        from "@/routes/home/page";

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

// ── App scaffold ──────────────────────────────────────────────────────────────

function scaffoldApp(appName, srcDir) {
  // Layout: max-w-[430px], h-svh, NO bg outside wrapper
  // Top navigation bar + content + bottom tab bar
  writeFileSync(join(srcDir, "routes/_layout.tsx"), `import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, Search, Bell, User } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { t } from "@/lib/i18n";

const TABS = [
  { to: "/",        icon: Home,   label: "Home",    end: true  },
  { to: "/search",  icon: Search, label: "Search",  end: false },
  { to: "/alerts",  icon: Bell,   label: "Alerts",  end: false },
  { to: "/profile", icon: User,   label: "Profile", end: false },
];

const ROUTE_TITLES: Record<string, string> = {
  "/":        "Home",
  "/search":  "Search",
  "/alerts":  "Alerts",
  "/profile": "Profile",
  "/settings":"Settings",
};

export function AppLayout() {
  const user     = useSession((s) => s.user);
  const location = useLocation();

  if (!user) return <Navigate to="/signin" replace />;

  const title = ROUTE_TITLES[location.pathname] ?? t("app.name");

  return (
    <div className="flex min-h-svh items-start justify-center">
      <div className="flex h-svh w-full max-w-[430px] flex-col overflow-hidden bg-background">

        {/* Top navigation bar */}
        <header className="flex h-12 shrink-0 items-center border-b bg-background px-4">
          <h1 className="text-sm font-semibold">{title}</h1>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom tab bar */}
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

  // Auth layout: same 430px shell, no bg outside
  writeFileSync(join(srcDir, "routes/_auth-layout.tsx"), `import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/hooks/use-session";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { t } from "@/lib/i18n";

export function AuthLayout() {
  const user = useSession((s) => s.user);
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-svh items-start justify-center">
      <div className="flex h-svh w-full max-w-[430px] flex-col overflow-hidden bg-background">
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

  // Home page: feed list with skeleton states
  mkdirSync(join(srcDir, "routes/home"), { recursive: true });
  writeFileSync(join(srcDir, "routes/home/page.tsx"), `import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/mocks/api";
import { t } from "@/lib/i18n";

export default function HomePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["feed"],
    queryFn:  api.listCustomers,
  });

  return (
    <div className="flex flex-col divide-y">
      {isLoading && Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}

      {isError && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              {t("common.loadError")}
              <Button size="sm" variant="ghost" onClick={() => refetch()}>
                {t("common.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <div className="p-4">
          <EmptyState title="Nothing here yet" />
        </div>
      )}

      {!isLoading && !isError && data?.map((item) => (
        <div key={item.id}
          className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {item.name.charAt(0)}
          </div>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="truncate text-sm font-medium">{item.name}</span>
            <span className="text-xs text-muted-foreground">{item.createdAt}</span>
          </div>
          <Badge variant={item.status === "active" ? "default" : "secondary"} className="text-xs">
            {t(\`customers.status.\${item.status}\`)}
          </Badge>
        </div>
      ))}
    </div>
  );
}
`);

  // Profile page
  mkdirSync(join(srcDir, "routes/profile"), { recursive: true });
  writeFileSync(join(srcDir, "routes/profile/page.tsx"), `import { useSession } from "@/hooks/use-session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Bell, Shield, HelpCircle } from "lucide-react";
import { t } from "@/lib/i18n";

const MENU_ITEMS = [
  { icon: Bell,        label: "Notifications" },
  { icon: Shield,      label: "Privacy & security" },
  { icon: HelpCircle,  label: "Help" },
];

export default function ProfilePage() {
  const { user, signOut } = useSession();

  return (
    <div className="flex flex-col">
      {/* Avatar section */}
      <div className="flex flex-col items-center gap-3 px-4 py-8">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-2xl font-semibold">
            {user?.name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Separator />

      {/* Menu items */}
      <nav className="flex flex-col divide-y">
        {MENU_ITEMS.map(({ icon: Icon, label }) => (
          <button key={label}
            className="flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-muted/50 active:bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-left">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </nav>

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
import { AppLayout }  from "@/routes/_layout";
import { AuthLayout } from "@/routes/_auth-layout";
import SignInPage      from "@/routes/signin/page";
import HomePage        from "@/routes/home/page";
import ProfilePage     from "@/routes/profile/page";
import SettingsPage    from "@/routes/settings/page";

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
        spin.succeed(`Preset fetched: ${brandName}`);
        if (presetTokens.primaryLight) {
          primaryLight = presetTokens.primaryLight;
          info(`  Primary color extracted: ${primaryLight}`);
        } else {
          warn(`  Could not extract a primary color — will use default. You can override below.`);
        }
        if (presetTokens.background) info(`  Background extracted: ${presetTokens.background}`);
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
  const { applied } = applyTheme(config, presetTokens, SRC);
  tSpin.succeed("Theme applied to src/index.css");
  for (const line of applied) info(`  ${line}`);

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
