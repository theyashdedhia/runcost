# RunCost — Per-User Cost Calculator

> Open source tool to calculate exactly how much each user costs you per month.

**Live demo**: open `index.html` directly in your browser — no server, no build step, no account.

---

## The Problem

When you're running a startup with Firebase, Supabase, LLM APIs, and mobile apps, answering "how much does each user cost us?" is surprisingly hard. Costs are scattered across a dozen dashboards and some are fixed, some scale with users, some scale with usage per user. This tool brings them all together.

## Features

- **Per-user cost** — automatic monthly and annual per-user cost at your current MAU
- **Scale projector** — see what happens to your costs at 100 / 10K / 100K users
- **60+ service presets** — Firebase, Supabase, all major LLM providers (OpenAI, Anthropic, Gemini, Mistral, Groq, Cohere, xAI), Vercel, Netlify, Cloudflare, dev tools (Claude Code, Cursor, GitHub Copilot), mobile (App Store, Play Store), and more
- **Custom costs** — add anything not in the catalog
- **Billing types**: Fixed monthly, fixed annual (auto-amortized), per user, usage-per-user (tokens, GB, API calls), one-time (amortized), per developer seat
- **Charts** — cost by category (donut), fixed vs variable by category (stacked bar), cost at scale (line)
- **Filters** — search, category chips, billing type, show/hide disabled entries
- **Multi-project** — compare costs for different apps side by side
- **Export** — JSON (full project), CSV (for spreadsheets), Print/PDF
- **Import** — load a project JSON file
- **100% local** — data lives in your browser's localStorage, nothing sent anywhere

## Usage

1. Clone or download this repo
2. Open `index.html` in a browser
3. Set your **Monthly Active Users** and **Developers** count in the header
4. Click **📦 Catalog** or **+ Add Cost** to add services
5. Toggle entries on/off, tweak amounts to match your actual bills
6. The summary cards and charts update live

## Contributing

Contributions are welcome — bug reports, new catalog entries, UI improvements, anything.

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

### Adding a Service to the Catalog

Edit `js/catalog.js` and add an entry to the `CATALOG` array:

```js
{
  key: 'my_service',          // unique snake_case key
  name: 'My Service Pro',     // display name
  category: 'backend',        // hosting | backend | infrastructure | ai | mobile | devtools | network | other
  billingType: 'fixed_monthly',
  baseAmount: 29,             // monthly cost in USD
  perUserAmount: 0,           // for billingType: per_user
  usagePerUser: 0,            // for billingType: usage_per_user (units/user/month)
  unitCost: 0,                // for billingType: usage_per_user (cost per unit)
  unitLabel: '',              // e.g. "tokens/month per user"
  seats: 1,                   // for billingType: per_seat (overridden by developer count)
  amortizeMonths: 12,         // for billingType: one_time or fixed_annual
  description: 'Short description of pricing',
  url: 'https://example.com/pricing',
}
```

Include the pricing source URL in your PR description so it can be verified.

## Billing Type Reference

| Type | Formula | When to use |
|---|---|---|
| `fixed_monthly` | base | Flat subscriptions (Vercel Pro, Supabase Pro) |
| `fixed_annual` | base ÷ 12 | Annual fees shown monthly (App Store $99/yr) |
| `per_user` | perUserAmount × MAU | Costs that literally charge per user |
| `usage_per_user` | usagePerUser × unitCost × MAU | API usage scaled by users (tokens, bandwidth) |
| `one_time` | base ÷ amortizeMonths | One-time fees spread over time |
| `per_seat` | base × seats | Dev tools billed per developer |

## Stack

- Pure HTML/CSS/JS — zero framework, zero build step
- [Chart.js](https://www.chartjs.org/) for charts (CDN)
- `localStorage` for data persistence
- Works offline

## License

MIT — free to use, fork, and contribute.
