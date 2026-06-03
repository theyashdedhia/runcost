'use strict';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function now() { return new Date().toISOString(); }

// ── In-memory store ──────────────────────────────────────────
let _projects = [];
let _activeId = null;

// ── Project CRUD ─────────────────────────────────────────────

function loadProjects() {
  return _projects.slice();
}

function saveProjects(projects) {
  _projects = projects.slice();
}

function createProject(name = 'My App') {
  const p = {
    id: uuid(),
    name,
    currency: 'USD',
    monthlyActiveUsers: 1000,
    developers: 3,
    costs: [],
    createdAt: now(),
    updatedAt: now(),
  };
  _projects.push(p);
  return p;
}

function getProject(id) {
  return _projects.find(p => p.id === id) || null;
}

function updateProject(updated) {
  _projects = _projects.map(p =>
    p.id === updated.id ? { ...updated, updatedAt: now() } : p
  );
}

function deleteProject(id) {
  _projects = _projects.filter(p => p.id !== id);
}

// ── Active project tracking ──────────────────────────────────

function getActiveId() {
  return _activeId;
}

function setActiveId(id) {
  _activeId = id;
}

// ── Cost entry CRUD (operates on a project) ──────────────────

function addCost(project, entry) {
  const cost = { ...entry, id: uuid(), enabled: entry.enabled !== false };
  project.costs.push(cost);
  updateProject(project);
  return cost;
}

function updateCost(project, updated) {
  project.costs = project.costs.map(c => c.id === updated.id ? updated : c);
  updateProject(project);
}

function deleteCost(project, id) {
  project.costs = project.costs.filter(c => c.id !== id);
  updateProject(project);
}

function toggleCost(project, id) {
  project.costs = project.costs.map(c =>
    c.id === id ? { ...c, enabled: !c.enabled } : c
  );
  updateProject(project);
}

// ── Import / Export ──────────────────────────────────────────

function exportJSON(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `runcost-${project.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(project, calcResult) {
  const rows = [
    ['Name', 'Owner', 'Category', 'Cost Type', 'Monthly Cost (USD)', 'Per-User Cost (USD)', '% of Total', 'Enabled', 'Notes'],
  ];
  for (const e of calcResult.entries) {
    const perUser = calcResult.mau > 0 ? e.monthly / calcResult.mau : 0;
    const pct = calcResult.total > 0 ? (e.monthly / calcResult.total * 100).toFixed(1) : '0';
    rows.push([
      `"${e.name}"`,
      `"${e.owner || ''}"`,
      e.category,
      e.billingType,
      e.monthly.toFixed(4),
      perUser.toFixed(6),
      pct + '%',
      e.enabled ? 'Yes' : 'No',
      `"${e.notes || ''}"`,
    ]);
  }
  rows.push([]);
  rows.push([`"Total Monthly"`, '', '', '', calcResult.total.toFixed(2)]);
  rows.push([`"Per-User Monthly"`, '', '', '', calcResult.perUser.toFixed(6)]);
  rows.push([`"Fixed Costs"`, '', '', '', calcResult.fixed.toFixed(2)]);
  rows.push([`"Variable Costs"`, '', '', '', calcResult.variable.toFixed(2)]);

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `runcost-${project.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function sanitizeCost(c) {
  const billingKeys = (typeof BILLING_TYPES !== 'undefined' ? BILLING_TYPES : [])
    .map(b => b.key);
  const categoryKeys = (typeof CATEGORIES !== 'undefined' ? CATEGORIES : [])
    .map(cat => cat.key);
  return {
    id: uuid(),
    name: String(c && c.name ? c.name : 'Unnamed cost').slice(0, 200),
    owner: c && c.owner ? String(c.owner).slice(0, 200) : '',
    category: c && categoryKeys.includes(c.category) ? c.category : 'other',
    billingType: c && billingKeys.includes(c.billingType) ? c.billingType : 'fixed_monthly',
    baseAmount: sanitizeNumber(c && c.baseAmount),
    perUserAmount: sanitizeNumber(c && c.perUserAmount),
    usagePerUser: sanitizeNumber(c && c.usagePerUser),
    unitCost: sanitizeNumber(c && c.unitCost),
    unitLabel: c && c.unitLabel ? String(c.unitLabel).slice(0, 100) : '',
    seats: sanitizeNumber(c && c.seats),
    amortizeMonths: Math.max(1, sanitizeNumber(c && c.amortizeMonths) || 12),
    notes: c && c.notes ? String(c.notes).slice(0, 1000) : '',
    enabled: c && c.enabled !== false,
  };
}

function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object' || !data.name || !Array.isArray(data.costs)) {
          reject(new Error('Invalid project file — missing name or costs array.'));
          return;
        }
        const imported = {
          id: uuid(),
          name: String(data.name).slice(0, 200),
          currency: 'USD',
          monthlyActiveUsers: Math.max(0, sanitizeNumber(data.monthlyActiveUsers)),
          developers: Math.max(1, sanitizeNumber(data.developers) || 1),
          costs: data.costs.filter(c => c && typeof c === 'object').map(sanitizeCost),
          createdAt: data.createdAt || now(),
          updatedAt: now(),
        };
        _projects.push(imported);
        resolve(imported);
      } catch (err) {
        reject(new Error('Could not parse JSON: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
