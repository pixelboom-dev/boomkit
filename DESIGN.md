# DESIGN — Interface rules and component usage

Part of **Boomkit** by [Pixel Boom](https://pixelboom.studio).

This document defines policies for screen creation, component instantiation, copy, and UI states. Applies to AI-generated code and human contributions unless otherwise noted.

---

## 0. Project configuration

> **Instructions:** fill in the fields below before using this document. Leave a field as `—` if it does not apply. AI agents must read this section first and treat every value here as a project-level override of any default mentioned in the rules below.

### 0.1. Colors

| Role | Light mode | Dark mode |
|------|-----------|-----------|
| **Primary** | `—` | `—` |

**Brand colors** — optional; used to generate tokens (e.g. `brand-primary`, `brand-accent`). Remove this table if the project has no brand colors.

| Name / role | Value |
|-------------|-------|
| `—` | `—` |

### 0.2. Typography

| Role | Family | Notes |
|------|--------|-------|
| **Sans** | `—` | Leave `—` to use Shadcn default |
| **Serif** | `—` | Leave `—` to use Shadcn default |
| **Mono** | `—` | Leave `—` to use Shadcn default |
| **Brand** | `—` | Dedicated font for specific brand moments (not acting as Sans or Serif) |

**Heading font:** `—` *(choose: Sans / Serif / Brand)*
**Body / UI elements font:** `—` *(choose: Sans / Serif / Brand)*

### 0.3. Theme settings

| Setting | Value | Options |
|---------|-------|---------|
| **Style** | `—` | Vega · Nova · Maia · Lyra · Mira · Luma · Sera · Rhea |
| **Icon library** | `—` | Lucide · Tabler · Hugeicons · Phosphor · Remix |
| **Radius** | `—` | Small · Medium · Large · Full |

---

## 1. Primary color tokens

| Context | Token / color |
|---------|---------------|
| **primary (light mode)** | `neutral-950` |
| **primary (dark mode)** | `neutral-50` |

Prefer theme variables (CSS variables / Shadcn tokens) aligned to these neutrals over loose color values.

---

## 2. Shadcn in screen construction

**Rule:** when instantiating any Shadcn component in screens, do **not** apply Tailwind classes on the instance. Customizations live **at the component level** (cva variants, theme, `tailwind.config`).

- **Exception:** changes made manually by humans (not AI) may follow a different team-agreed flow.

**Layout vs. visual on the instance**

- On **instances** of Shadcn primitives: avoid `className` for color, border, shadow, typography, radius, or internal "brand" padding.
- **Page layout** (containers, grid, gap, positioning): Tailwind classes allowed when they don't duplicate what the component already handles.

---

## 3. Native dialogs

**Prohibited:** browser `alert()`, `confirm()`, and `prompt()`.

**Use instead:**

- Feedback: **Sonner** (`toast`, `toast.error`, etc.)
- Confirmations / blocking flows: **`<AlertDialog>`** (Shadcn)

---

## 4. Prioritize Shadcn primitives

Don't build visual blocks with plain Tailwind when a Shadcn equivalent already exists.

**Example**

- `<Card>` exists → don't use `<div className="rounded-lg border shadow-sm p-6">` for the same purpose.

---

## 5. Icons inside `<Button>`

**Never** add Tailwind classes to an icon component that is a child of `<Button>`. The Shadcn `Button` defines icon size and color.

---

## 6. Dark mode

**Every screen** must work in both light and dark mode.

- With correct theme tokens (section 1), dark mode tends to work for free.
- Always validate both modes before opening a PR.

---

## 7. Empty state

Lists, grids, and tables that can have no data must render **`<EmptyState>`**.

- Screen with a blank area = **bug**.
- **Where the component lives:** `src/components/ui/empty-state.tsx` (or the project's equivalent UI components folder).

---

## 8. Prohibited (visual hardcode / parallel systems)

| Prohibited | Reason |
|------------|--------|
| Parallel palettes (`bg-blue-500`, `text-zinc-700`, etc.) | Breaks theme consistency |
| Hardcoded shadows (`shadow-[0_4px_12px_rgba(0,0,0,0.1)]`) | Use theme tokens / utilities |
| Loose fonts (`font-['Inter']`, etc.) | Typography comes from the theme |
| `style={{ ... }}` for **purely visual** properties | Prefer theme and design-system-derived classes |

---

## 9. Copy and screen structure

### 9.1. Title and subtitle

- **No redundant subtitle.** If the title already communicates the context, don't repeat it in the subtitle.
- Subtitle **only** when it adds useful data (context, scope, count).

| Situation | Example |
|-----------|---------|
| Bad | Title: "Customers" / Subtitle: "Manage your customers here" |
| Good | Title: "Customers" (no subtitle) |
| Good | Title: "Customers" / Subtitle: "32 active · 4 inactive" |

### 9.2. Description after title

`<description>` (or equivalent subtitle slot in cards, dialogs, sheets, and similar components) is **only used when strictly necessary** — meaning the title alone is genuinely insufficient for the user to understand context or consequence.

- If the title is already clear and self-contained, **omit the description entirely**.
- A description that restates, paraphrases, or adds no new information is worse than no description — it adds visual noise and dilutes focus.

| Situation | Example |
|-----------|---------|
| Bad | Title: "Delete account" / Description: "This will delete your account." |
| Good | Title: "Delete account" (no description) |
| Good | Title: "Delete account" / Description: "All data will be permanently removed and cannot be recovered." |
| Bad | Title: "Edit profile" / Description: "Update your profile information." |
| Good | Title: "Edit profile" (no description) |

This rule applies to: `<Card>`, `<Dialog>`, `<Sheet>`, `<Alert>`, `<Drawer>`, and any other component that exposes a title + description pattern.

### 9.3. Tone

- Short sentences: if it can be said in 5 words, don't use 12.
- **No marketing language:** avoid "amazing", "powerful", "simply", "with just one click", etc.
- **Neutral and objective** tone — the user is working.

---

## 10. Buttons — labels

**Rule:** a single label, **verb in the infinitive**, describing the action.

**Correct examples:** Add, Save, Duplicate, Remove, Expand, Cancel, Confirm, Send, Import, Export, Edit, Select, Delete, Set.

**Avoid:** "Click to add", "Save now", "OK", "Yes", "Add new customer" when the context is already "customer".

**Allowed exceptions**

- Genuine ambiguity between actions (e.g. "Save and continue" vs "Save and close").
- Onboarding or marketing CTAs **outside** the authenticated app (may follow a different guide).

---

## 11. Feedback messages

| Type | Guidance |
|------|----------|
| **Success** | Past-tense affirmation: "Customer added", "Changes saved". |
| **Error** | Direct: "Failed to save. Please try again." Avoid "Oops!", "Something went wrong". |
| **Destructive confirmation** | Make the consequence clear: "Remove this item? This action cannot be undone." |

For submit/action errors, prefer `toast.error()` (Sonner) when it fits the product pattern.

---

## 12. Required states in data screens

Every screen that loads data must handle **four** states.

### 12.1. Loading

- Lists, grids, tables, cards: **`<Skeleton>`** (Shadcn), mirroring the final content structure.
- Buttons / point actions: disabled button + spinner **inside** the button (`<Button disabled>` + `<Loader2 className="animate-spin" />` — `animate-spin` is behavior, not a loose brand style).
- **Avoid:** a single generic spinner in the center of the screen as the only loading feedback for a list.

### 12.2. Error

- **`<Alert variant="destructive">`** with a translated message; add a **retry** action where it makes sense.
- Submit/action errors: `toast.error()` (Sonner), aligned with section 11.

### 12.3. Empty

- Use **`<EmptyState>`** (required).
- **Anatomy:** icon (Lucide) + short title + optional description + primary CTA when applicable.
- **No CTA** only when the empty state is terminal (e.g. "No results for the applied filter").

### 12.4. Success (data loaded)

- Render the actual content.
- Do **not** show text like "Data loaded successfully" just to fill the state.

---

## 13. Action buttons in components with footer

Components that have a dedicated footer block — such as `<Dialog>`, `<Sheet>`, `<DrawerFooter>`, `<CardFooter>`, etc. — must place **all primary action buttons** inside that block.

- **Never** render primary actions (Save, Confirm, Delete, Submit, etc.) inside `<DialogContent>`, `<SheetContent>`, `<CardContent>`, or equivalent content areas.
- Secondary/destructive actions (Cancel, Close) follow the same rule: they belong in the footer alongside the primary action.

| Situation | Example |
|-----------|---------|
| Bad | `<DialogContent>` contains a `<Button>Save</Button>` at the bottom |
| Good | `<DialogFooter>` contains `<Button variant="ghost">Cancel</Button>` + `<Button>Save</Button>` |
| Bad | `<CardContent>` contains a `<Button>Edit</Button>` at the bottom |
| Good | `<CardFooter>` contains `<Button>Edit</Button>` |

---

## 14. Internationalization

All user-facing strings must go through **`t()`** (or the project's equivalent). Don't hardcode "temporary" text in a PR.

---

## 15. Local component documentation

Components in `_components/` (or equivalent feature folders) must have a **short README** — required even for small components.

---

## 16. Quick glossary (AI mental defaults)

| Question | Default |
|----------|---------|
| "Can I add this Tailwind class to the Shadcn instance?" | If it's **layout** (spacing, positioning, container size): generally yes on the **page layout**. If it's **color / border / shadow / typography / radius / internal padding**: **no** — use theme or a component variant. |
| "I need a different visual from Shadcn." | 1) Revisit the theme. 2) Add a variant with **`cva`**. Don't override with `className` on the instance. |
| "This string is temporary." | Still use **`t()`**. |
| "The screen is simple; do I need empty/loading/error states?" | **Yes.** |
| "Can I use `alert()` just for testing?" | **No.** Use `toast.error()` or `AlertDialog`. |
| "The button looks plain." | Expected behavior; identity changes go in the **theme**, not the instance. |
| "Should I document this small component in `_components/`?" | **Yes** — a short README is enough. |
| "Can I put a Save button inside `<DialogContent>`?" | **No.** Primary actions go in `<DialogFooter>` (or equivalent footer block). |
| "Should I add a `<description>` below the title?" | Only if the title alone is insufficient. If the description just paraphrases the title, **omit it**. |

---

*Last updated: generic boilerplate for Next.js projects with Shadcn and Tailwind. Adjust component paths if the project structure differs.*
