# AGENTS — Boomkit bootstrap playbook

You are the bootstrap agent for **Boomkit** (by Pixel Boom). Your one job: take the user from a clean clone to a running prototype in under 5 minutes, ending at `http://localhost:9900` in their browser.

## Read before you act

1. [DESIGN-RULES.md](./DESIGN-RULES.md) — UI rules. **Every file you write or edit must obey them.** Read §0 (project config) and the rule index in full before touching any TSX.
2. [SETUP.md](./SETUP.md) — project structure and screen-by-screen checklist.
3. [prototype.config.example.json](./prototype.config.example.json) — the schema you will fill.

## Before you start

**Setup is handled by the CLI** (`pnpm setup`), not by you. When the user says `start boomkit`, the following are already done:

- `prototype.config.json` exists and is filled in.
- `DESIGN-RULES.md §0` reflects the chosen values.
- `pnpm bootstrap` has run — `src/`, `node_modules`, and Shadcn components are in place.
- The dev server is running at `http://localhost:${app.devPort}`.

Your job starts here: **read the config and scaffold screens**. Do not re-run bootstrap, do not ask config questions, do not run `pnpm install`.

If `prototype.config.json` is missing, tell the user to run `pnpm setup` in the terminal first.

---

## Step 1 — Read config and greet

1. Read `prototype.config.json`.
2. Read [DESIGN-RULES.md](./DESIGN-RULES.md) in full — §0 for the project values, §1–16 for the UI rules you must follow on every file you write.
3. Greet the user with a one-line summary: app name, product type, and dev URL. Nothing more.

## Step 2 — Scaffold screens based on product type

After `pnpm dev` is running, scaffold the appropriate screens depending on `app.productType`. The templates in `src/` ship the SaaS desktop baseline; adapt or replace routes as needed.

#### SaaS desktop (default)

Follow [SETUP.md §10](./SETUP.md#10-baseline-prototype-scaffold) exactly as written. Ships:

- Sign in / Sign up (auth shell, centered card)
- Dashboard — stat cards + recent activity list (4 states)
- Customers CRUD — list table, create form, detail + edit, delete with `<AlertDialog>`
- Settings — `<Tabs>` skeleton (Profile, Preferences, Theme)

Navigation: left sidebar with Lucide icons. Desktop-first layout.

#### Website

Replace the default SaaS routes with marketing-oriented screens. Ships:

- `/` — Landing page: full-width hero (headline + CTA button + optional product screenshot), features grid (3–4 `<Card>` items), social proof strip, and a pricing section with 2–3 plan cards.
- `/about` — Short brand story + team grid or values list.
- `/blog` — Post list (title, date, short excerpt); each post links to `/blog/:slug`.
- `/blog/:slug` — Single post with prose layout (large readable column, no sidebar).
- `/contact` — Single contact form (`<Card>` + react-hook-form + zod). Submit → `toast.success`.
- `/signin` — Minimal sign-in card (same rules as §10.2 but without sidebar in layout).

Navigation: sticky top navbar with logo, links, and a primary CTA button. No sidebar. Mobile: hamburger → `<Sheet>` drawer.

Layout shell (`_layout.tsx`): renders the top navbar and full-width `<Outlet>`. No session guard on public routes.

#### App

Replace the default SaaS routes with mobile-first screens. Ships:

- `/onboarding` — 3-step card flow (name, preferences, notifications). Progress indicator. Final step redirects to `/`.
- `/` — Feed / home: vertical list of items with `<Skeleton>` loading, `<EmptyState>` for zero items, pull-to-top refresh button.
- `/items/:id` — Detail view: item header + metadata + action buttons in a bottom-fixed `<div>` (no `<CardFooter>` — this is a page-level action bar).
- `/profile` — Avatar + display name + stats row. Edit profile opens a `<Sheet>`.
- `/settings` — Account settings: `<Tabs>` (Account, Notifications, Appearance). Sign-out at the bottom.
- `/signin` — Auth card, same rules as §10.2.

Navigation: bottom tab bar (4 tabs with icons + labels) instead of a left sidebar. Max content width `640px`, centered. Touch targets ≥ 44px.

Layout shell (`_layout.tsx`): wraps everything in a centered viewport container (see below) that renders the bottom tab bar and `<Outlet>`. Session guard: redirect to `/signin` if no user.

**Mobile viewport wrapper** — for App prototypes, the entire UI must be contained in a max-width shell that simulates a phone screen on any display:

```tsx
// src/routes/_layout.tsx (App variant)
export function AppLayout() {
  return (
    <div className="flex min-h-svh items-start justify-center bg-muted/40">
      <div className="relative flex h-svh w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-xl">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <BottomTabBar />
      </div>
    </div>
  );
}
```

Rules for the wrapper:
- Max width `430px`, centered horizontally with `justify-center`.
- Background outside the shell: `bg-muted/40` (subtle contrast, never a loose color).
- The shell uses `h-svh` so it fills the screen height exactly — no scrolling outside the shell.
- Only `<main>` scrolls (with `overflow-y-auto`); the tab bar is always pinned at the bottom.
- Apply the same wrapper to the auth layout so `/signin` and `/onboarding` also render within `430px`.

---

## Step 3 — Hand off

In one short message: what was scaffolded, seed credentials, and where to go next:

- Add a new screen → [SETUP.md §11](./SETUP.md#11-building-new-screens--the-checklist)
- For SaaS desktop — add a new CRUD entity → mirror `src/routes/customers/`
- Tweak the theme → `src/index.css` (tokens) + `docs/theme.md`

## Rules while you work

These are **hard constraints** — violating them breaks Boomkit's contract.

- Never invent visual values. Read DESIGN-RULES.md §1 and §8.
- Primary actions go inside footer blocks of Card/Dialog/Sheet ([DESIGN-RULES.md §13](./DESIGN-RULES.md#13-action-buttons-in-components-with-footer)).
- Skip `<description>` when title is enough ([§9.2](./DESIGN-RULES.md#92-description-after-title)).
- All user-facing strings go through `t()` ([§14](./DESIGN-RULES.md#14-internationalization)).
- Dev port range is 9900+ with `strictPort: true` ([SETUP.md §2.1](./SETUP.md#21-viteconfigts)).
- No `alert()` / `confirm()` / `prompt()`. Ever. Use Sonner toasts or `<AlertDialog>` ([DESIGN-RULES.md §3](./DESIGN-RULES.md#3-native-dialogs)).
- Every data screen must handle all four states: loading, error, empty, success ([DESIGN-RULES.md §12](./DESIGN-RULES.md#12-required-states-in-data-screens)).

## Terminal confirmations

`pnpm bootstrap` runs with `CI=1` and `npm_config_yes=true` so every prompt from `pnpm dlx`, the Shadcn CLI, and any sub-tool auto-confirms. You should not see a `[y/N]` prompt during a normal run.

If something **does** prompt you (e.g. a new tool that ignores those env vars), follow these rules:

- **Safe / reversible** (downloading a package, overwriting a generated file, creating a directory): confirm automatically. Mention it in your hand-off summary so the user knows what was accepted.
- **Destructive or ambiguous** (overwriting a file the user clearly edited, deleting their config, running a database migration): **stop and ask the user** via the editor's question UI before proceeding.

Default to auto-confirm for the bootstrap path. The user can always inspect `git status` afterwards to review what changed.

## Fallback if bootstrap fails

If `pnpm bootstrap` errors (shadcn CLI drift, network, etc.):

1. Capture the failing command + stderr.
2. Tell the user which step broke.
3. Offer the manual path: follow [SETUP.md §1–10](./SETUP.md) by hand.
4. Open an issue / note for the Boomkit maintainers with the captured error so the script can be patched.

Do **not** silently regenerate templates from scratch — that defeats Boomkit's core promise (deterministic baseline). The agent's job is config + orchestration, not screen generation.
