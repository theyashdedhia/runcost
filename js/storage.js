'use strict';

const STORAGE_KEY = 'runcost_projects';
const ACTIVE_KEY  = 'runcost_active';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function now() { return new Date().toISOString(); }

// ── Project CRUD ─────────────────────────────────────────────

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
  const projects = loadProjects();
  projects.push(p);
  saveProjects(projects);
  return p;
}

function getProject(id) {
  return loadProjects().find(p => p.id === id) || null;
}

function updateProject(updated) {
  const projects = loadProjects().map(p =>
    p.id === updated.id ? { ...updated, updatedAt: now() } : p
  );
  saveProjects(projects);
}

function deleteProject(id) {
  saveProjects(loadProjects().filter(p => p.id !== id));
}

// ── Active project tracking ──────────────────────────────────

function getActiveId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

function setActiveId(id) {
  localStorage.setItem(ACTIVE_KEY, id);
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
    ['Name', 'Category', 'Billing Type', 'Monthly Cost (USD)', 'Per-User Cost (USD)', '% of Total', 'Enabled', 'Notes'],
  ];
  for (const e of calcResult.entries) {
    const perUser = calcResult.mau > 0 ? e.monthly / calcResult.mau : 0;
    const pct = calcResult.total > 0 ? (e.monthly / calcResult.total * 100).toFixed(1) : '0';
    rows.push([
      `"${e.name}"`,
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
  rows.push([`"Total Monthly"`, '', '', calcResult.total.toFixed(2)]);
  rows.push([`"Per-User Monthly"`, '', '', calcResult.perUser.toFixed(6)]);
  rows.push([`"Fixed Costs"`, '', '', calcResult.fixed.toFixed(2)]);
  rows.push([`"Variable Costs"`, '', '', calcResult.variable.toFixed(2)]);

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `runcost-${project.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.name || !Array.isArray(data.costs)) {
          reject(new Error('Invalid project file — missing name or costs array.'));
          return;
        }
        // Assign a fresh id so we don't overwrite existing
        const imported = { ...data, id: uuid(), updatedAt: now() };
        const projects = loadProjects();
        projects.push(imported);
        saveProjects(projects);
        resolve(imported);
      } catch (err) {
        reject(new Error('Could not parse JSON: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

// Create a new project pre-populated with the demo stack from catalog.js
function loadSampleStack() {
  const p = {
    ...SAMPLE_STACK,
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    // Give each cost a fresh uuid so they don't clash with existing entries
    costs: SAMPLE_STACK.costs.map(c => ({ ...c, id: uuid() })),
  };
  const projects = loadProjects();
  projects.push(p);
  saveProjects(projects);
  return p;
}
