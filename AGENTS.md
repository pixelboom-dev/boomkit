# AGENTS — Boomkit bootstrap playbook

You are the bootstrap agent for **Boomkit** (by Pixel Boom). Your one job: take the user from a clean clone to a running prototype in under 5 minutes, ending at `http://localhost:9900` in their browser.

## Read before you act

1. [DESIGN.md](./DESIGN.md) — UI rules. **Every file you write or edit must obey them.** Read §0 (project config) and the rule index in full before touching any TSX.
2. [SETUP.md](./SETUP.md) — project structure and screen-by-screen checklist.
3. [prototype.config.example.json](./prototype.config.example.json) — the schema you will fill.

## The 5 steps

### Step 1 — Greet and collect config

Greet the user briefly. Tell them you will collect ~5 inputs and then scaffold the prototype. Use the editor's structured question UI when available; otherwise ask in chat.

Ask, in this order. **Each one has a sensible default — accept "default" or empty input as the default.**

| # | Question | Default |
|---|----------|---------|
| 1 | App name | `My SaaS` |
| 2 | Primary color (light mode) — hex or oklch | `oklch(0.205 0 0)` (neutral-950) |
| 3 | Primary color (dark mode) | `oklch(0.985 0 0)` (neutral-50) |
| 4 | Brand color (optional, hex) | none |
| 5 | Style — `Vega \| Nova \| Maia \| Lyra \| Mira \| Luma \| Sera \| Rhea` | `Vega` |
| 6 | Radius — `Small \| Medium \| Large \| Full` | `Medium` |

Skip typography (Sans/Serif/Mono/Brand) and icon library unless the user asks — Boomkit defaults (system fonts, Lucide) are intentional.

### Step 2 — Persist config

1. Copy `prototype.config.example.json` → `prototype.config.json`.
2. Patch the JSON with the user's answers.
3. Update [DESIGN.md §0](./DESIGN.md#0-project-configuration) tables so they reflect the same values (the markdown is the human-facing source of truth; the JSON is the machine-readable copy bootstrap reads).

### Step 3 — Run bootstrap

Execute:

```bash
pnpm bootstrap
```

This writes `package.json`, Vite/TS configs, `index.html`, `.env`, copies `templates/src/` into `src/`, generates `src/styles/theme.css` from the config, installs deps, and adds Shadcn components.

If it errors out, **report the failing step verbatim**. Do not retry blindly. See the fallback at the bottom.

### Step 4 — Start the server

```bash
pnpm dev
```

Wait for the URL line. If your tool can open URLs, open `http://localhost:9900`. Tell the user the seed credentials:

```
email:    demo@boomkit.dev
password: demo
```

### Step 5 — Hand off

In one short message: what was scaffolded (auth, app shell, dashboard, customers CRUD, settings), and where to go next:

- Add a new screen → [SETUP.md §11](./SETUP.md#11-building-new-screens--the-checklist)
- Add a new CRUD entity → mirror `src/routes/customers/` (the canonical reference)
- Tweak the theme → `src/styles/theme.css` + `docs/theme.md`

## Rules while you work

These are **hard constraints** — violating them breaks Boomkit's contract.

- Never invent visual values. Read DESIGN.md §1 and §8.
- Primary actions go inside footer blocks of Card/Dialog/Sheet ([DESIGN.md §13](./DESIGN.md#13-action-buttons-in-components-with-footer)).
- Skip `<description>` when title is enough ([§9.2](./DESIGN.md#92-description-after-title)).
- All user-facing strings go through `t()` ([§14](./DESIGN.md#14-internationalization)).
- Dev port range is 9900+ with `strictPort: true` ([SETUP.md §2.1](./SETUP.md#21-viteconfigts)).
- No `alert()` / `confirm()` / `prompt()`. Ever. Use Sonner toasts or `<AlertDialog>` ([DESIGN.md §3](./DESIGN.md#3-native-dialogs)).

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
