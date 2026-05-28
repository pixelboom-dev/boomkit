# Dashboard components

Route-scoped components for `/`. Per DESIGN.md §15, each component here ships a short README.

- `section-cards.tsx` — Four KPI cards in a responsive grid with trend badges + footer insights. Inspired by the official `dashboard-01` block.
- `chart-area-interactive.tsx` — Stacked area chart with toggleable time range (7d / 30d / 90d). Switches to a Select on small screens.
- `recent-customers.tsx` — Recent customers table preview with all four data states. Links to the full Customers list.
