# SETUP — Boomkit scaffold reference (Vite + Shadcn, fully mocked)

Part of **Boomkit** by [Pixel Boom](https://pixelboom.studio).

Step-by-step to bootstrap a navigable, fully-mocked SaaS prototype. Use this guide **together with [DESIGN-RULES.md](./DESIGN-RULES.md)** — DESIGN-RULES.md governs UI rules; this file governs project structure and tooling.

> **Goal:** a lightweight, navigable prototype with zero backend. All data is mocked in-memory. Every screen, route, and component documented and theme-ready.

---

## 0. Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (or npm/yarn — examples use `pnpm`)
- Read [DESIGN-RULES.md §0](./DESIGN-RULES.md#0-project-configuration) and fill in project configuration **before** running setup. Product type, color tokens, fonts, style, icon library, and radius determine what gets scaffolded and how the theme is generated.

### Product type

`prototype.config.json` → `app.productType` controls which screen set the agent scaffolds in Step 5 of [AGENTS.md](./AGENTS.md):

| Value | Layout | Nav | Screens |
|-------|--------|-----|---------|
| `saas-desktop` | Sidebar + topbar | Left sidebar | Dashboard metrics, data tables, CRUD, settings |
| `website` | Top navbar | Horizontal links + CTA | Landing/hero, features, pricing, blog, contact, sign-in |
| `app` | Bottom tab bar | 4 tabs, mobile-first | Onboarding flow, feed, detail, profile, account settings |

The bootstrap script is identical for all three — it copies `templates/src/` and installs Shadcn. The agent adapts routes, layouts, and nav after bootstrap based on `productType`.

### Theme preset

If the user picks a theme preset from [awesome-design-md](https://github.com/voltagent/awesome-design-md), the agent fetches that brand's DESIGN.md and extracts color/typography/radius values automatically. The preset values populate `prototype.config.json` and DESIGN-RULES.md §0. The user can override any value afterwards.

---

## 1. Create the Vite project

```bash
pnpm create vite@latest my-saas -- --template react-ts
cd my-saas
pnpm install
```

Recommended baseline dependencies:

```bash
pnpm add react-router-dom zod zustand @tanstack/react-query sonner
pnpm add -D tailwindcss @tailwindcss/vite tailwindcss-animate
pnpm add -D @types/node
```

---

## 2. Configure Tailwind v4 + path aliases

### 2.1. `vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: Number(process.env.VITE_DEV_PORT ?? 9900),
    strictPort: true, // fail loudly instead of silently bumping to the next free port
  },
  preview: {
    port: Number(process.env.VITE_PREVIEW_PORT ?? 9901),
    strictPort: true,
  },
});
```

> **Port policy:** prototypes run on a high, uncommon port range (`9900+`) to avoid colliding with backends, other dev servers, or local services on `3000`/`5173`/`8080`. `strictPort: true` ensures the dev server **fails** instead of quietly switching ports — collisions get fixed, not hidden.

### 2.2. `tsconfig.json` — add `paths`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### 2.3. `src/index.css` — Tailwind entry

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));
```

---

## 3. Install Shadcn

```bash
pnpm dlx shadcn@latest init
```

Answer the prompts using the values from [DESIGN-RULES.md §0.3](./DESIGN-RULES.md#03-theme-settings):

- **Style** → the value chosen in DESIGN-RULES.md §0.3 (Vega, Nova, Maia, etc.)
- **Base color** → matches `Primary` in §0.1
- **Icon library** → matches §0.3
- **CSS variables** → **yes** (mandatory — DESIGN-RULES.md §1 requires theme variables)

Install the components the prototype will need up front:

```bash
pnpm dlx shadcn@latest add button card dialog sheet alert alert-dialog \
  input label select skeleton sonner badge avatar separator dropdown-menu \
  table tabs textarea form
```

---

## 4. Theme — translate DESIGN-RULES.md §0 into tokens

All values from [DESIGN-RULES.md §0](./DESIGN-RULES.md#0-project-configuration) live in **`src/styles/theme.css`** (imported from `index.css`):

```css
@layer base {
  :root {
    /* §0.1 Primary — light */
    --primary: <value from DESIGN-RULES.md §0.1 light>;
    --primary-foreground: <contrast>;

    /* §0.1 Brand (optional) */
    --brand-primary: <value or remove>;

    /* §0.2 Typography */
    --font-sans: <value or system default>;
    --font-serif: <value or system default>;
    --font-mono: <value or system default>;
    --font-brand: <value or remove>;
    --font-heading: var(--font-<sans|serif|brand>);

    /* §0.3 Radius */
    --radius: <0.25rem | 0.5rem | 1rem | 9999px>;
  }

  .dark {
    --primary: <value from DESIGN-RULES.md §0.1 dark>;
    --primary-foreground: <contrast>;
  }
}
```

**Rules:**

- Never add a color/font/radius value outside this file. DESIGN-RULES.md §1 and §8 forbid parallel palettes.
- Adding a new token means: (1) define it here, (2) document it in `docs/theme.md` (see §9).

---

## 5. Project structure

```
my-saas/
├── public/
├── src/
│   ├── app/                      # router + providers
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── routes/                   # one folder per route
│   │   ├── _layout.tsx           # app shell (sidebar + topbar)
│   │   ├── _auth-layout.tsx      # auth shell (no sidebar)
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── _components/      # route-scoped components (see §11)
│   │   ├── customers/
│   │   │   ├── page.tsx          # list
│   │   │   ├── new/page.tsx      # create
│   │   │   ├── [id]/page.tsx     # detail + edit
│   │   │   └── _components/
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn primitives (auto-generated)
│   │   ├── empty-state.tsx       # DESIGN-RULES.md §7 — required
│   │   └── app/                  # shared app components (sidebar, topbar)
│   ├── mocks/                    # see §6
│   │   ├── db.ts
│   │   ├── fixtures/
│   │   └── api.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   └── i18n.ts               # DESIGN-RULES.md §13 — t() lives here
│   ├── hooks/
│   ├── styles/
│   │   └── theme.css
│   └── main.tsx
├── docs/                         # see §9
│   ├── theme.md
│   └── components.md
├── .env
├── .env.example
└── README.md
```

---

## 6. Mocked data layer

**Principle:** the prototype must behave like a real SaaS — async, with loading/error/empty states — without any backend. Mocks live entirely in memory and reset on reload.

### 6.1. Fixtures

`src/mocks/fixtures/customers.ts`:

```ts
import type { Customer } from "@/mocks/db";

export const customers: Customer[] = [
  { id: "1", name: "Acme Inc.", status: "active", createdAt: "2026-01-12" },
  { id: "2", name: "Globex", status: "inactive", createdAt: "2026-02-03" },
];
```

### 6.2. In-memory DB

`src/mocks/db.ts` — a singleton with typed collections + CRUD helpers.

```ts
import { customers } from "./fixtures/customers";

export type Customer = { id: string; name: string; status: "active" | "inactive"; createdAt: string };

export const db = {
  customers: [...customers],
};
```

### 6.3. Fake API

`src/mocks/api.ts` — wraps `db` with `Promise` + artificial latency + occasional errors (controlled by env vars, see §8). This is what components import — **never** import `db` directly from a screen.

```ts
import { db } from "./db";

const LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 400);
const ERROR_RATE = Number(import.meta.env.VITE_MOCK_ERROR_RATE ?? 0);

const wait = <T,>(value: T) =>
  new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < ERROR_RATE) reject(new Error("Mock failure"));
      else resolve(value);
    }, LATENCY);
  });

export const api = {
  listCustomers: () => wait(db.customers),
  getCustomer: (id: string) => wait(db.customers.find((c) => c.id === id)),
  createCustomer: (input: Omit<Customer, "id" | "createdAt">) =>
    wait((db.customers.push({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }), db.customers.at(-1)!)),
};
```

This forces every screen to handle all four states from [DESIGN-RULES.md §12](./DESIGN-RULES.md#12-required-states-in-data-screens).

---

## 7. Routing + app shell

Use `react-router-dom` v6+. Layout route renders the persistent shell (sidebar + topbar); child routes render in the `<Outlet>`.

`src/app/router.tsx`:

```tsx
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/routes/_layout";
import { AuthLayout } from "@/routes/_auth-layout";
import SignInPage from "@/routes/signin/page";
import SignUpPage from "@/routes/signup/page";
import DashboardPage from "@/routes/dashboard/page";
import CustomersPage from "@/routes/customers/page";
import CustomerNewPage from "@/routes/customers/new/page";
import CustomerDetailPage from "@/routes/customers/[id]/page";
import SettingsPage from "@/routes/settings/page";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/signin", element: <SignInPage /> },
      { path: "/signup", element: <SignUpPage /> },
    ],
  },
  {
    element: <AppLayout />, // guards: redirects to /signin if no session
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/customers", element: <CustomersPage /> },
      { path: "/customers/new", element: <CustomerNewPage /> },
      { path: "/customers/:id", element: <CustomerDetailPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);
```

`src/app/providers.tsx` wraps `<QueryClientProvider>`, `<RouterProvider>`, `<Toaster>` (Sonner — DESIGN-RULES.md §3), and the theme provider.

---

## 8. Environment variables

`.env.example` — committed; `.env` — gitignored.

```
# Prototype identity
VITE_APP_NAME="My SaaS"
VITE_APP_ENV=prototype

# Dev server (see §2.1 — must stay in the 9900+ range to avoid local conflicts)
VITE_DEV_PORT=9900
VITE_PREVIEW_PORT=9901

# Mock layer behavior (see §6.3)
VITE_MOCK_LATENCY_MS=400        # ms of artificial latency
VITE_MOCK_ERROR_RATE=0          # 0 to 1 — random failure rate to exercise error states

# Theme
VITE_DEFAULT_THEME=system       # light | dark | system
```

Every variable that affects UI behavior must be documented here. Vite requires the `VITE_` prefix to expose vars to the client.

---

## 9. Documentation structure

Documentation lives under `docs/` and is mandatory:

### 9.1. `docs/theme.md`

Single source of truth for every token defined in §4. For each token: name, role, light/dark values, where it's used. Update on every theme change.

### 9.2. `docs/components.md`

Index of shared components in `src/components/app/` and `src/components/`. Each entry: name, purpose, props summary, link to its local README.

### 9.3. Local READMEs

Per [DESIGN-RULES.md §15](./DESIGN-RULES.md#15-local-component-documentation), **every** component inside any `_components/` folder must ship a `README.md`. Minimum content:

```md
# <ComponentName>

**Purpose:** one line.
**Props:** bullet list.
**States handled:** loading / error / empty / success (mark which).
**Used in:** route paths.
```

---

## 10. Baseline prototype scaffold

The prototype ships with the following screens scaffolded out of the box. Build them in this order — each step depends on the previous.

### 10.1. Mock auth + session store

`src/mocks/auth.ts` — fake `signIn`, `signUp`, `signOut`. Persist the current user in `localStorage` (key: `prototype-session`).

`src/hooks/use-session.ts` — zustand store reading from `localStorage`. Exposes `user`, `signIn(email, password)`, `signUp(...)`, `signOut()`. All methods call `src/mocks/auth.ts` (which respects `VITE_MOCK_LATENCY_MS` and `VITE_MOCK_ERROR_RATE`).

**Seed user** in `src/mocks/fixtures/users.ts` so the prototype can be entered without signing up — document the credentials in `README.md`.

### 10.2. Auth shell + Sign in / Sign up

`src/routes/_auth-layout.tsx` — centered card, theme toggle, link to marketing site. Redirects to `/` if a session already exists.

`src/routes/signin/page.tsx`:

- `<Card>` with `<form>` using `<Input>` + `<Label>` (email, password).
- Submit button in `<CardFooter>` ([DESIGN-RULES.md §13](./DESIGN-RULES.md#13-action-buttons-in-components-with-footer)).
- Errors → `toast.error()` ([DESIGN-RULES.md §11](./DESIGN-RULES.md#11-feedback-messages)).
- Link to `/signup`.
- On success: redirect to `/`.

`src/routes/signup/page.tsx` — same structure, extra `name` field. On success: auto-signin and redirect to `/`.

> Title/description: follow [DESIGN-RULES.md §9.1/§9.2](./DESIGN-RULES.md#91-title-and-subtitle). "Sign in" needs no description; "Create account" needs no description.

### 10.3. App shell — sidebar + topbar

`src/routes/_layout.tsx`:

- Guards the session — redirects to `/signin` if `user` is null.
- Renders `<Sidebar>` (desktop) and `<Sheet>` trigger for mobile.
- Renders `<Topbar>` with theme toggle + `<DropdownMenu>` (user avatar → Settings, Sign out).
- `<Outlet>` for child routes.

`src/components/app/sidebar.tsx` — nav items: Dashboard, Customers, Settings. Active item highlighted with theme tokens (no hardcoded colors — [DESIGN-RULES.md §8](./DESIGN-RULES.md#8-prohibited-visual-hardcode--parallel-systems)). Each item: Lucide icon (or the library chosen in DESIGN-RULES.md §0.3) + label via `t()`.

`src/components/app/topbar.tsx` — title slot, theme toggle, user menu.

### 10.4. Dashboard (`/`)

`src/routes/dashboard/page.tsx`:

- 3–4 `<Card>` widgets with mocked stats (total customers, active, inactive, last 7 days).
- A "Recent activity" list — handles all four states ([DESIGN-RULES.md §12](./DESIGN-RULES.md#12-required-states-in-data-screens)).
- No subtitle on the page header unless it adds count/scope data.

### 10.5. CRUD example — Customers

The canonical reference CRUD. Every future entity copies this pattern.

**List — `src/routes/customers/page.tsx`:**

- `<Table>` of customers from `api.listCustomers()`.
- Header action: `<Button>` linking to `/customers/new` (label: `Add`, infinitive — [DESIGN-RULES.md §10](./DESIGN-RULES.md#10-buttons--labels)).
- Loading → `<Skeleton>` rows.
- Empty → `<EmptyState>` with primary CTA "Add" ([DESIGN-RULES.md §7](./DESIGN-RULES.md#7-empty-state) / [§12.3](./DESIGN-RULES.md#123-empty)).
- Error → `<Alert variant="destructive">` with retry.
- Row click → navigates to `/customers/:id`.

**Create — `src/routes/customers/new/page.tsx`:**

- `<Card>` with `<Form>` (react-hook-form + zod schema).
- Footer: `<Button variant="ghost">Cancel</Button>` + `<Button type="submit">Save</Button>`.
- Success: `toast.success("Customer added")` + redirect to detail.
- Error: `toast.error(...)`.

**Detail + edit — `src/routes/customers/[id]/page.tsx`:**

- Header: customer name, edit/delete actions.
- Inline edit (or dialog) reusing the same zod schema.
- **Delete** → `<AlertDialog>` ([DESIGN-RULES.md §3](./DESIGN-RULES.md#3-native-dialogs)) with footer containing `Cancel` + `Delete` ([§13](./DESIGN-RULES.md#13-action-buttons-in-components-with-footer)). On confirm: `api.deleteCustomer(id)` → toast + redirect to list.
- Loading → `<Skeleton>`. Error → `<Alert variant="destructive">`.

**Mock endpoints** in `src/mocks/api.ts`: `listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `deleteCustomer`. All persist to the in-memory `db` (resets on reload — documented behavior).

### 10.6. Settings (placeholder)

`src/routes/settings/page.tsx` — `<Tabs>` skeleton (Profile, Preferences, Theme). Renders the theme toggle and sign-out button. Other tabs render `<EmptyState>` with "Coming soon" copy and no CTA (terminal empty state — [DESIGN-RULES.md §12.3](./DESIGN-RULES.md#123-empty)).

---

## 10b. Screen sets by product type

### Website (`productType: "website"`)

| Route | File | Notes |
|-------|------|-------|
| `/` | `routes/home/page.tsx` | Hero + features grid + pricing + social proof |
| `/about` | `routes/about/page.tsx` | Brand story + values or team |
| `/blog` | `routes/blog/page.tsx` | Post list with excerpt cards |
| `/blog/:slug` | `routes/blog/[slug]/page.tsx` | Single post, prose layout |
| `/contact` | `routes/contact/page.tsx` | Contact form → `toast.success` |
| `/signin` | `routes/signin/page.tsx` | Auth card (no sidebar) |

Layout shell: sticky top navbar with links + primary CTA. Mobile: hamburger → `<Sheet>` drawer. No session guard on public routes.

### App (`productType: "app"`)

| Route | File | Notes |
|-------|------|-------|
| `/onboarding` | `routes/onboarding/page.tsx` | 3-step card flow, progress indicator |
| `/` | `routes/home/page.tsx` | Feed list, 4 states, pull-to-top refresh |
| `/items/:id` | `routes/items/[id]/page.tsx` | Detail + bottom-fixed action bar |
| `/profile` | `routes/profile/page.tsx` | Avatar + stats + edit via `<Sheet>` |
| `/settings` | `routes/settings/page.tsx` | `<Tabs>` for Account, Notifications, Appearance |
| `/signin` | `routes/signin/page.tsx` | Auth card |

Layout shell: centered viewport container (`max-w-[430px]`, `h-svh`) that wraps the entire UI — bottom tab bar pinned at the bottom, `<main>` scrolls internally. The area outside the shell uses `bg-muted/40`. This renders a phone-sized prototype on any desktop display. Auth routes (`/signin`, `/onboarding`) use the same `430px` container. Touch targets ≥ 44 px. Session guard: redirect to `/signin` if no user.

---

## 11. Building new screens — the checklist

For every new screen built **after** the §10 baseline, in order:

1. **Route file** under `src/routes/<name>/page.tsx`.
2. **Mock endpoint** in `src/mocks/api.ts` (never call `db` directly).
3. **Four states** ([DESIGN-RULES.md §12](./DESIGN-RULES.md#12-required-states-in-data-screens)): loading (`<Skeleton>`), error (`<Alert variant="destructive">`), empty (`<EmptyState>`), success.
4. **Copy** through `t()` ([DESIGN-RULES.md §14](./DESIGN-RULES.md#14-internationalization)). Title/description rules from [§9](./DESIGN-RULES.md#9-copy-and-screen-structure).
5. **Light + dark mode** validated ([DESIGN-RULES.md §6](./DESIGN-RULES.md#6-dark-mode)).
6. **Route-scoped components** in `_components/`, each with a README ([§9.3](#93-local-readmes)).
7. If it follows a CRUD pattern, **mirror the Customers reference** ([§10.5](#105-crud-example--customers)).

---

## 12. Run

```bash
pnpm dev          # http://localhost:9900
pnpm build        # production bundle
pnpm preview      # http://localhost:9901
```

Different prototype on the same machine? Bump to the next free pair (`9902` / `9903`, etc.) via `.env` — never reuse `3000`, `5173`, or `8080`.

---

## 13. Definition of done — prototype-level

A prototype is "ready to share" when:

- [ ] Sign in / Sign up flows work end-to-end with the seed user ([§10.1–10.2](#101-mock-auth--session-store)).
- [ ] App shell guards routes — unauthenticated access redirects to `/signin` ([§10.3](#103-app-shell--sidebar--topbar)).
- [ ] Dashboard renders with all four states ([§10.4](#104-dashboard-)).
- [ ] Customers CRUD covers list, create, detail, edit, delete with `<AlertDialog>` confirmation ([§10.5](#105-crud-example--customers)).
- [ ] All routes navigable from the sidebar.
- [ ] No browser `alert/confirm/prompt` ([DESIGN-RULES.md §3](./DESIGN-RULES.md#3-native-dialogs)).
- [ ] No hardcoded colors/fonts/shadows ([DESIGN-RULES.md §8](./DESIGN-RULES.md#8-prohibited-visual-hardcode--parallel-systems)).
- [ ] Every data screen handles all four states.
- [ ] Light and dark mode pass visual inspection.
- [ ] `VITE_MOCK_ERROR_RATE=1` exercises every error state without crashing.
- [ ] `docs/theme.md` and `docs/components.md` reflect current state.
- [ ] Seed user credentials documented in `README.md`.

---

*Companion to [DESIGN-RULES.md](./DESIGN-RULES.md). When this file and DESIGN-RULES.md disagree, DESIGN-RULES.md wins.*
