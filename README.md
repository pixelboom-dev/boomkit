# Boomkit

**AI-native kit for fully-mocked SaaS prototypes. Auth, shell, CRUD ready in minutes.**

Boomkit is an open-source asset by [Pixel Boom](https://pixelboom.studio) — a design + technology studio that delivers MVPs at studio speed for validation and go-to-market. We built Boomkit because every prototype we ship starts from the same handful of decisions: navigation, auth, CRUD, design tokens, mocked data, the four data states. So we baked them in.

Boomkit ships three things in one repo:

1. A **documented UI rule set** ([DESIGN.md](./DESIGN.md)) that any agent or human can follow without guessing.
2. A **deterministic scaffolder** ([SETUP.md](./SETUP.md) + [`scripts/bootstrap.mjs`](./scripts/bootstrap.mjs)) that turns a config file into a working Vite + Shadcn app.
3. A **functioning baseline prototype** — auth, app shell, dashboard, full CRUD — with mocked data, realistic loading/error/empty states, and light/dark mode wired up.

Clone, run `pnpm start`, let your AI editor follow [AGENTS.md](./AGENTS.md), and you have a navigable SaaS prototype running on `http://localhost:9900`.

---

## Why Boomkit exists

Pixel Boom's job is to make ideas tangible fast — landing pages, MVPs, internal tools, click-through prototypes that survive a stakeholder review. Every one of those projects begins with the same ~80% of plumbing: routing, auth shell, sidebar, theme tokens, table + form + dialog + toast, loading skeletons. The remaining 20% — the actual product idea — is what we'd rather spend time on.

Most starter kits solve **bootstrapping**. They don't solve **consistency**. And almost none are built to be driven by an AI agent.

Boomkit collapses the three artifacts that normally drift apart:

| Artifact | Usually | In Boomkit |
|---|---|---|
| Design rules | A Figma doc nobody reads | A markdown spec the agent reads on every edit |
| Project scaffold | A 30-step README | One command (`pnpm bootstrap`) |
| Prototype baseline | "Add it later" | Already in `templates/` — copied during scaffold |

The result: every prototype generated from Boomkit starts at the same quality bar, regardless of who (or which model) ran the bootstrap.

---

## Who Boomkit is for

- **Product designers & PMs** building click-through prototypes to validate flows without waiting on backend.
- **Founders** mocking up SaaS ideas to share with investors, advisors, or early users.
- **Engineers** needing a realistic UI to integrate with before any API exists.
- **Studios & agencies** (like us) that ship multiple MVPs a month and need a defensible baseline.
- **Workshop facilitators** teaching prototyping — every attendee finishes with the same working baseline.
- **Design system teams** wanting an executable reference, not just docs.

If you've ever copy-pasted yesterday's "sidebar + dashboard + table" into a new repo, Boomkit replaces that ritual.

---

## What you get out of the box

After `pnpm bootstrap` finishes, you have a running app with:

- **Authentication** — sign in / sign up against an in-memory user store, session persisted to `localStorage`.
- **App shell** — responsive sidebar (Sheet on mobile), topbar with theme toggle and user menu, route guards.
- **Dashboard** — sample stat widgets and recent-activity list, all four data states handled.
- **Customers CRUD** — list, create, detail, edit, delete with `<AlertDialog>` confirmation. The canonical reference pattern: every new entity mirrors this folder.
- **Settings** — tab skeleton with theme switcher (light / dark / system).
- **Light + dark mode** driven entirely by theme tokens.
- **Mocked async layer** with configurable latency and error rate so you can exercise loading and error states deterministically.
- **Sonner toasts** for feedback, `<AlertDialog>` for destructive confirmations (no native `alert()`).

Default seed credentials:

```
email:    demo@boomkit.dev
password: demo
```

---

## Why Boomkit, not something else

**vs. `create-vite` / `create-next-app`:** those give you an empty shell. Boomkit gives you a working SaaS with auth, navigation, and a complete CRUD reference — plus the rules to extend it consistently.

**vs. Shadcn examples / dashboard templates:** those are demos you copy-paste from. Boomkit is a *scaffold pipeline* — config-driven, agent-orchestrated, with the design rules versioned alongside the code.

**vs. v0 / Lovable / Bolt:** those generate one-off screens with no shared spec. Boomkit produces deterministic baselines and lets agents *follow rules* across edits, not just regenerate every time.

**vs. internal "blank repo" templates:** those rot. Boomkit's rules in `DESIGN.md` are auto-attached via Cursor rules on every TSX edit, and the bootstrap regenerates from a single config — drift is structurally harder.

**Concrete properties:**

- **AI-native by design.** [`AGENTS.md`](./AGENTS.md) is the agent playbook. Works with Cursor, Claude Code, Windsurf, and any tool that reads `AGENTS.md`.
- **Deterministic baseline.** Templates are copied verbatim — workshop attendees and studio teams end up with identical working code, regardless of which model their editor uses.
- **Manual escape hatch.** `cp prototype.config.example.json prototype.config.json && pnpm bootstrap` works without any AI.
- **Portable rule set.** The DESIGN.md / SETUP.md / AGENTS.md trio can be lifted into any existing project.
- **Port-safe.** Dev server defaults to `:9900` with `strictPort: true` — never collides with `:3000` / `:5173` / `:8080` quietly.

---

## Quick start

### With an AI editor (recommended)

```bash
git clone https://github.com/pixelboom-dev/boomkit my-prototype
cd my-prototype
pnpm start
```

Then open the folder in Cursor / Claude Code / Windsurf / etc. and tell the agent:

> start boomkit

The agent reads [`AGENTS.md`](./AGENTS.md) and walks you through:

1. Six config questions (app name, primary colors, brand color, style, radius — all with defaults)
2. Writes `prototype.config.json` and updates `DESIGN.md` §0
3. Runs `pnpm bootstrap`
4. Starts the dev server

Total time: ~3–5 minutes including install.

### Manual path (no AI)

```bash
git clone https://github.com/pixelboom-dev/boomkit my-prototype
cd my-prototype
cp prototype.config.example.json prototype.config.json
# Edit prototype.config.json — change app name, colors, etc.
pnpm bootstrap
pnpm dev
```

App available at `http://localhost:9900`.

---

## How it works

```
┌──────────────────────┐    ┌────────────────────────┐    ┌─────────────────────┐
│  prototype.config    │───▶│   scripts/bootstrap    │───▶│   Running Vite app  │
│  .json (your input)  │    │   .mjs (8 steps)       │    │   on :9900          │
└──────────────────────┘    └────────────────────────┘    └─────────────────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │  templates/src/      │
                            │  (baseline screens)  │
                            └──────────────────────┘
```

The bootstrap script:

1. Writes a full `package.json` with all runtime + dev dependencies.
2. Writes Vite, TypeScript, and `index.html` configs.
3. Writes `.env` / `.env.example` with mock-layer knobs.
4. Copies `templates/src/` into `src/`.
5. Generates `src/styles/theme.css` from your config (primary colors, brand colors, radius, fonts).
6. Generates `docs/theme.md` and `docs/components.md` scaffolds.
7. Runs `pnpm install`.
8. Runs `pnpm dlx shadcn@latest add` for the ~19 primitives the templates depend on.

Templates obey every rule in `DESIGN.md` — primary actions live in footer slots, descriptions are omitted when titles are self-explanatory, all strings flow through `t()`, no hardcoded colors anywhere.

---

## Technical description

### Stack

- **Build:** Vite 6
- **Framework:** React 19 + TypeScript 5.6
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`) + Shadcn UI (`new-york` style)
- **Routing:** React Router 6 with layout routes (auth shell vs. app shell)
- **State:** Zustand (session) + TanStack Query (server state, even though it's mocked)
- **Forms:** React Hook Form + Zod
- **Feedback:** Sonner (toasts) + Shadcn `<AlertDialog>` (confirmations)
- **Icons:** Lucide React (swappable via `prototype.config.json`)
- **Runtime:** Node ≥ 20, pnpm ≥ 9

This is the same lightweight stack Pixel Boom uses for production MVPs — chosen for cold-start speed, small bundle, and fast HMR.

### Mock data layer

There is no backend. The mock layer lives in `src/mocks/`:

- `db.ts` — in-memory singleton, typed collections. Resets on page reload.
- `api.ts` — public API. Wraps `db` with `Promise` + configurable latency + configurable error rate.
- `auth.ts` — sign-in / sign-up against the same `db.users` collection.
- `fixtures/` — seed data.

Two environment variables make the mock layer behave like real network code:

```
VITE_MOCK_LATENCY_MS=400   # artificial latency for every call
VITE_MOCK_ERROR_RATE=0     # 0 to 1 — random failure rate
```

Setting `VITE_MOCK_ERROR_RATE=1` triggers every error state in the app, which is how you verify error handling end-to-end before shipping the prototype.

### Project structure (after bootstrap)

```
my-prototype/
├── DESIGN.md                          # UI rules (read before edits)
├── SETUP.md                           # scaffold reference
├── AGENTS.md                          # agent playbook
├── prototype.config.json              # your config
├── package.json
├── vite.config.ts
├── components.json                    # Shadcn config
├── docs/
│   ├── theme.md                       # token reference
│   └── components.md                  # component index
├── templates/                         # untouched — re-runnable bootstrap
├── scripts/
│   ├── kickoff.mjs
│   └── bootstrap.mjs
└── src/
    ├── main.tsx
    ├── index.css
    ├── styles/theme.css               # generated from prototype.config.json
    ├── app/                           # router + providers
    ├── routes/
    │   ├── _layout.tsx                # app shell (guarded)
    │   ├── _auth-layout.tsx           # auth shell
    │   ├── signin/page.tsx
    │   ├── signup/page.tsx
    │   ├── dashboard/page.tsx
    │   ├── customers/                 # canonical CRUD reference
    │   │   ├── page.tsx               # list
    │   │   ├── new/page.tsx           # create
    │   │   └── [id]/page.tsx          # detail + edit + delete
    │   └── settings/page.tsx
    ├── components/
    │   ├── ui/                        # Shadcn primitives
    │   ├── empty-state.tsx            # required, per DESIGN.md §7
    │   └── app/                       # sidebar, topbar, theme provider/toggle
    ├── hooks/
    │   └── use-session.ts             # zustand + localStorage
    ├── lib/
    │   ├── i18n.ts                    # t() dictionary
    │   └── utils.ts                   # cn() etc.
    └── mocks/
        ├── db.ts
        ├── api.ts
        ├── auth.ts
        └── fixtures/
```

### Configuration

Everything project-specific is captured in `prototype.config.json`:

```json
{
  "app": { "name": "My SaaS", "devPort": 9900, "previewPort": 9901 },
  "colors": {
    "primary": {
      "light": "oklch(0.205 0 0)",
      "dark":  "oklch(0.985 0 0)"
    },
    "brand": []
  },
  "typography": {
    "sans": null, "serif": null, "mono": null, "brand": null,
    "heading": "sans", "body": "sans"
  },
  "theme": {
    "style": "Vega",
    "iconLibrary": "Lucide",
    "radius": "Medium"
  }
}
```

Re-running `pnpm bootstrap` after editing this file regenerates `theme.css`, `.env`, `vite.config.ts`, and `index.html`. Source files in `src/routes/`, `src/components/`, etc. are **not** overwritten — the bootstrap is safe to re-run.

### Scripts

| Command | What it does |
|---|---|
| `pnpm start` | Prints kickoff instructions for the AI agent |
| `pnpm bootstrap` | Reads `prototype.config.json` and scaffolds the app |
| `pnpm dev` | Vite dev server on `:9900` |
| `pnpm build` | Production bundle |
| `pnpm preview` | Serve the build on `:9901` |
| `pnpm typecheck` | TypeScript without emit |

---

## Customizing

### Change colors / fonts / radius

Edit `prototype.config.json`, re-run `pnpm bootstrap`. Theme CSS regenerates from the config.

If you want to tweak more advanced tokens (`--accent`, `--muted`, etc.), edit `src/styles/theme.css` directly and document the change in `docs/theme.md`.

### Add a new entity (CRUD)

Mirror `src/routes/customers/`:

1. Add a type + fixture in `src/mocks/fixtures/`.
2. Register the collection on `db` (`src/mocks/db.ts`).
3. Add CRUD methods on `api` (`src/mocks/api.ts`).
4. Copy `src/routes/customers/` to `src/routes/<entity>/` and rename.
5. Add the route to `src/app/router.tsx` and the sidebar nav item.

See [SETUP.md §11](./SETUP.md#11-building-new-screens--the-checklist) for the full per-screen checklist.

### Swap the icon library

Change `theme.iconLibrary` in `prototype.config.json` to `Tabler`, `Hugeicons`, `Phosphor`, or `Remix` and re-run `pnpm bootstrap`. Templates import from `lucide-react` by default — if you change the library, update the imports accordingly.

### Use Boomkit as a rule pack only

You don't need the scaffolder to benefit from the rules. Copy `DESIGN.md`, `SETUP.md`, and `.cursor/rules/` into any existing Vite + Shadcn project and the agent will follow the same rules on edits.

---

## Design rules at a glance

Full spec in [DESIGN.md](./DESIGN.md). The non-negotiables:

- Primary actions live in footer blocks (`CardFooter`, `DialogFooter`, etc.) — never inside content areas.
- `<description>` after a title is only used when the title is genuinely insufficient.
- No browser `alert()`, `confirm()`, or `prompt()` — Sonner toasts or `<AlertDialog>`.
- No Tailwind classes on Shadcn primitive instances for visual properties (color, border, shadow, typography, radius, internal padding). Layout classes are fine.
- Every data screen handles all four states: loading, error, empty, success.
- All user-facing strings go through `t()`.
- Light + dark mode must work on every screen.

These rules are enforced via `.cursor/rules/design-md.mdc`, which Cursor auto-attaches to every TSX edit. Claude Code reads the same rules from `AGENTS.md` and `DESIGN.md` directly.

---

## Roadmap

- Vendored Shadcn components for offline-safe workshops (removes the `pnpm dlx` step in bootstrap).
- Codemod step that rewrites Lucide imports when `iconLibrary` is swapped.
- Additional baseline screens: notifications, billing, team management, audit log.
- Alternative `style` packs (Nova, Maia, Lyra, etc.) beyond the Vega default.
- i18n runtime swap (drop `t()` dictionary for `i18next` with one flag).

## Known limitations

- The bootstrap depends on `pnpm dlx shadcn@latest add` succeeding. If the Shadcn CLI changes its flags, the bootstrap may need a patch — fallback documented in `AGENTS.md`.
- Templates assume `lucide-react`. Switching `iconLibrary` requires manual import updates today.
- No production auth — Boomkit is a *prototype* kit. Don't deploy `src/mocks/auth.ts` to real users.

---

## Contributing

Pull requests welcome — especially:

- New baseline screens
- Alternative `style` packs
- Vendored Shadcn components
- Translations of the `t()` dictionary

Before opening a PR, read [DESIGN.md](./DESIGN.md) and verify your changes don't violate any rule.

---

## About Pixel Boom

[Pixel Boom](https://pixelboom.studio) is a design and technology studio that delivers MVPs at studio speed — fast validation, clean stacks, go-to-market in weeks, not quarters. Boomkit is the open-source residue of that practice: the parts of our internal scaffold that we think every studio, founder, and team should have.

If Boomkit saved you a weekend, [say hi](https://pixelboom.studio).

---

## License

MIT. Use Boomkit for prototypes, workshops, client demos, internal tools — whatever helps you ship faster.
