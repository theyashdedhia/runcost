'use strict';

// Returns the monthly cost of a single cost entry given project context.
function calcEntry(entry, mau, devCount) {
  const b = entry.billingType;
  if (b === 'fixed_monthly')  return entry.baseAmount || 0;
  if (b === 'fixed_annual')   return (entry.baseAmount || 0) / 12;
  if (b === 'per_user')       return (entry.perUserAmount || 0) * mau;
  if (b === 'usage_per_user') return (entry.usagePerUser || 0) * (entry.unitCost || 0) * mau;
  if (b === 'one_time')       return (entry.baseAmount || 0) / Math.max(1, entry.amortizeMonths || 12);
  if (b === 'per_seat')       return (entry.baseAmount || 0) * Math.max(1, entry.seats || devCount || 1);
  return 0;
}

const FIXED_TYPES = new Set(['fixed_monthly', 'fixed_annual', 'per_seat', 'one_time']);
const VAR_TYPES   = new Set(['per_user', 'usage_per_user']);

// Full project calculation. Returns a rich result object used by UI + charts.
function calcProject(project) {
  const mau  = Math.max(0, project.monthlyActiveUsers || 0);
  const devs = Math.max(1, project.developers || 1);
  const enabled = (project.costs || []).filter(c => c.enabled);

  const entries = enabled.map(c => ({
    ...c,
    monthly: calcEntry(c, mau, devs),
  }));

  const total    = entries.reduce((s, e) => s + e.monthly, 0);
  const fixed    = entries.filter(e => FIXED_TYPES.has(e.billingType)).reduce((s, e) => s + e.monthly, 0);
  const variable = entries.filter(e => VAR_TYPES.has(e.billingType)).reduce((s, e) => s + e.monthly, 0);
  const perUser  = mau > 0 ? total / mau : 0;

  // Group by category for chart
  const byCategory = {};
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.monthly;
  }

  return { entries, total, fixed, variable, perUser, byCategory, mau, devs };
}

// Calculate totals at different user scales for the scale chart.
function calcScale(project) {
  const scales = [10, 100, 500, 1000, 5000, 10000, 50000, 100000];
  return scales.map(u => {
    const r = calcProject({ ...project, monthlyActiveUsers: u });
    return { users: u, total: r.total, perUser: r.perUser };
  });
}
