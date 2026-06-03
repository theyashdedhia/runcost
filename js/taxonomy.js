'use strict';

// ── Taxonomy ─────────────────────────────────────────────────
// RunCost does not ship a catalog of named vendors (their prices change
// constantly and would always be wrong). Instead you describe each line
// item by two things: a Category (what kind of cost it is) and a Cost Type
// (how it is billed). You enter the actual numbers from your own invoices.

const CATEGORIES = [
  { key: 'hosting',        label: 'Hosting',        color: '#4f9cf9' },
  { key: 'backend',        label: 'Backend',        color: '#a78bfa' },
  { key: 'infrastructure', label: 'Infrastructure', color: '#f97316' },
  { key: 'ai',             label: 'AI / LLM',       color: '#00d4aa' },
  { key: 'mobile',         label: 'Mobile',         color: '#fbbf24' },
  { key: 'devtools',       label: 'Dev Tools',      color: '#f472b6' },
  { key: 'network',        label: 'Network',        color: '#38bdf8' },
  { key: 'other',          label: 'Other',          color: '#94a3b8' },
];

// Cost types — how a line item is billed. `desc` is shown as a hint in the
// Add/Edit form so users can pick the right one without guessing.
const BILLING_TYPES = [
  { key: 'fixed_monthly',  label: 'Subscription — monthly',  desc: 'A flat amount billed every month (e.g. a $25/mo plan).' },
  { key: 'fixed_annual',   label: 'Subscription — annual',   desc: 'A flat amount billed once a year; shown amortized to a monthly figure.' },
  { key: 'per_user',       label: 'Per active user',         desc: 'A fixed amount charged for each monthly active user.' },
  { key: 'usage_per_user', label: 'Usage-based (per user)',  desc: 'Usage that scales with users: usage/user × cost/unit × MAU (tokens, GB, API calls).' },
  { key: 'one_time',       label: 'One-time',                desc: 'A single upfront cost, spread over a number of months you choose.' },
  { key: 'per_seat',       label: 'Per seat',                desc: 'Billed per developer/team seat (e.g. dev tools). Monthly = cost × seats.' },
];

function getCategoryMeta(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

function getBillingMeta(key) {
  return BILLING_TYPES.find(b => b.key === key) || { key, label: key, desc: '' };
}
