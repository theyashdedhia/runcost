# RunCost — Per-User Cost Calculator

> Open source tool to calculate exactly how much each user costs you per month.

**Live demo**: open `index.html` directly in your browser — no server, no build step, no account.

---

## The Problem

When you're running a startup with Firebase, Supabase, LLM APIs, and mobile apps, answering "how much does each user cost us?" is surprisingly hard. Costs are scattered across a dozen dashboards and some are fixed, some scale with users, some scale with usage per user. This tool brings them all together.

## Features

- **Per-user cost** — automatic monthly and annual per-user cost at your current MAU
- **Scale projector** — see what happens to your costs at 100 / 10K / 100K users
- **Six cost types** — you describe *how* each line item is billed and enter the numbers from your own invoices: Subscription (monthly), Subscription (annual, auto-amortized), Per active user, Usage-based per user (tokens, GB, API calls), One-time (amortized), Per seat. No vendor price lists to go stale.
- **Owner tracking** — record who internally owns each account/subscription (person name or account ID)
- **Categories** — group costs as Hosting, Backend, Infrastructure, AI/LLM, Mobile, Dev Tools, Network, or Other
- **Charts** — cost by category (donut), fixed vs variable by category (stacked bar), cost at scale (line)
- **Filters** — search (name/owner/category), category chips, cost type, show/hide disabled entries
- **Multi-project** — compare costs for different apps side by side
- **Export** — JSON (full project), CSV (for spreadsheets), Print/PDF
- **Import** — load a project JSON file (malformed entries are sanitized, not crashed on)
- **100% local** — data lives only in your browser tab; nothing is sent anywhere. Export to JSON to save your work between sessions.

## Usage

1. Clone or download this repo
2. Open `index.html` in a browser
3. Set your **Monthly Active Users** and **Developers** count in the header
4. Click **+ Add Cost**, give it a name and owner, pick a **Cost Type**, and enter the amount from your invoice
5. Toggle entries on/off, tweak amounts to match your actual bills
6. The summary cards and charts update live

## Contributing

Contributions are welcome — bug reports, new categories or cost types, UI improvements, anything.

### Raising an Issue

1. Go to [github.com/theyashdedhia/runcost/issues](https://github.com/theyashdedhia/runcost/issues)
2. Click **New issue**
3. Describe what's wrong or what you'd like added — include steps to reproduce for bugs, and pricing source URLs for new services

### Opening a Pull Request

1. Fork the repo
2. Create a branch: `git checkout -b my-feature`
3. Make your changes
4. Open a PR against `main` with a short description of what changed and why

No build step, no test suite to run — just edit the files and open the PR.

### Adding a Category or Cost Type

RunCost intentionally ships **no vendor price list** — vendor prices change constantly and would always be wrong. You pick a cost type and enter your own numbers. If you want to add a new **category** or **cost type**, edit `js/taxonomy.js` (the `CATEGORIES` and `BILLING_TYPES` arrays). Cost types also need a formula in `calcEntry()` in `js/calculator.js`.

## Cost Type Reference

| Cost Type | Formula | When to use |
|---|---|---|
| Subscription — monthly | base | Flat monthly plans (e.g. a $25/mo plan) |
| Subscription — annual | base ÷ 12 | Annual fees shown monthly (e.g. App Store $99/yr) |
| Per active user | perUserAmount × MAU | Costs that literally charge per user |
| Usage-based (per user) | usagePerUser × unitCost × MAU | Usage scaled by users (tokens, GB, API calls) |
| One-time | base ÷ amortizeMonths | One-time fees spread over time |
| Per seat | base × seats | Dev tools billed per developer/team seat |

## Stack

- Pure HTML/CSS/JS — zero framework, zero build step
- [Chart.js](https://www.chartjs.org/) for charts (CDN)
- In-memory only — export to JSON to save your work between sessions
- Works offline

## License

MIT — free to use, fork, and contribute.
