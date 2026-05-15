'use strict';

// ── State ────────────────────────────────────────────────────
let state = {
  project: null,
  calcResult: null,
  filters: {
    search: '',
    categories: [],   // empty = all
    billingType: '',  // empty = all
    showDisabled: false,
  },
  sort: { col: 'monthly', dir: 'desc' },
  editingCostId: null, // null = adding new
};

// ── Formatters ───────────────────────────────────────────────
function fmtUSD(n, digits = 2) {
  if (Math.abs(n) < 0.0001 && n !== 0) return '$' + n.toExponential(2);
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtSmall(n) {
  if (n === 0) return '$0.000';
  if (n < 0.001) return '$' + n.toFixed(6);
  if (n < 1)     return '$' + n.toFixed(4);
  return fmtUSD(n);
}

// ── Summary cards ────────────────────────────────────────────
function renderSummary(r) {
  document.getElementById('card-total').textContent    = fmtUSD(r.total);
  document.getElementById('card-per-user').textContent = fmtSmall(r.perUser);
  document.getElementById('card-fixed').textContent    = fmtUSD(r.fixed);
  document.getElementById('card-variable').textContent = fmtUSD(r.variable);
  document.getElementById('card-annual').textContent   = fmtUSD(r.total * 12);

  // annual per user
  const annualPerUser = r.mau > 0 ? (r.total * 12) / r.mau : 0;
  document.getElementById('card-annual-pu').textContent = fmtSmall(annualPerUser);
}

// ── Category filter chips ─────────────────────────────────────
function renderCategoryChips() {
  const el = document.getElementById('category-chips');
  el.innerHTML = '';
  for (const cat of CATEGORIES) {
    const active = state.filters.categories.length === 0 ||
                   state.filters.categories.includes(cat.key);
    const chip = document.createElement('button');
    chip.className = 'chip' + (active ? ' chip-active' : '');
    chip.style.setProperty('--chip-color', cat.color);
    chip.textContent = cat.label;
    chip.addEventListener('click', () => {
      const f = state.filters.categories;
      if (f.length === 0) {
        // switch to showing only this one
        state.filters.categories = [cat.key];
      } else if (f.includes(cat.key)) {
        const next = f.filter(k => k !== cat.key);
        state.filters.categories = next.length === CATEGORIES.length - 1 ? [] : next;
      } else {
        const next = [...f, cat.key];
        state.filters.categories = next.length === CATEGORIES.length ? [] : next;
      }
      renderCategoryChips();
      renderTable();
    });
    el.appendChild(chip);
  }

  // "All" chip
  const allChip = document.createElement('button');
  allChip.className = 'chip' + (state.filters.categories.length === 0 ? ' chip-active' : '');
  allChip.style.setProperty('--chip-color', '#94a3b8');
  allChip.textContent = 'All';
  allChip.addEventListener('click', () => {
    state.filters.categories = [];
    renderCategoryChips();
    renderTable();
  });
  el.prepend(allChip);
}

// ── Cost table ────────────────────────────────────────────────
function getFilteredEntries() {
  const all = state.project.costs.slice();
  return all.filter(c => {
    if (!state.filters.showDisabled && !c.enabled) return false;
    if (state.filters.categories.length > 0 && !state.filters.categories.includes(c.category)) return false;
    if (state.filters.billingType && c.billingType !== state.filters.billingType) return false;
    if (state.filters.search) {
      const q = state.filters.search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.category.includes(q)) return false;
    }
    return true;
  });
}

function renderTable() {
  const tbody = document.getElementById('cost-tbody');
  const entries = getFilteredEntries();

  // Attach monthly costs
  const mau  = state.project.monthlyActiveUsers || 0;
  const devs = state.project.developers || 1;
  const withMonthly = entries.map(c => ({
    ...c,
    monthly: calcEntry(c, mau, devs),
  }));

  // Sort
  const { col, dir } = state.sort;
  withMonthly.sort((a, b) => {
    let va = a[col], vb = b[col];
    if (col === 'monthly') { va = a.monthly; vb = b.monthly; }
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const total = state.calcResult ? state.calcResult.total : 0;

  tbody.innerHTML = '';
  if (withMonthly.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No cost entries yet. Click <strong>+ Add Cost</strong> to get started.</td></tr>`;
    return;
  }

  for (const e of withMonthly) {
    const perUser = mau > 0 ? e.monthly / mau : 0;
    const pct = total > 0 ? (e.monthly / total * 100).toFixed(1) : '0';
    const catMeta = getCategoryMeta(e.category);
    const billingMeta = BILLING_TYPES.find(b => b.key === e.billingType) || { label: e.billingType };
    const tr = document.createElement('tr');
    tr.className = e.enabled ? '' : 'row-disabled';
    tr.innerHTML = `
      <td class="td-toggle">
        <label class="toggle-switch" title="${e.enabled ? 'Enabled' : 'Disabled'}">
          <input type="checkbox" ${e.enabled ? 'checked' : ''} data-id="${e.id}" class="toggle-cost">
          <span class="toggle-track"></span>
        </label>
      </td>
      <td class="td-name">
        <span class="cost-name">${esc(e.name)}</span>
        ${e.notes ? `<span class="cost-notes">${esc(e.notes)}</span>` : ''}
      </td>
      <td><span class="badge" style="--badge-color:${catMeta.color}">${catMeta.label}</span></td>
      <td class="td-billing"><span class="billing-label">${billingMeta.label}</span></td>
      <td class="td-amount">${fmtUSD(e.monthly)}</td>
      <td class="td-amount">
        ${fmtSmall(perUser)}
        <span class="pct">${pct}%</span>
      </td>
      <td class="td-actions">
        <button class="btn-icon btn-edit" data-id="${e.id}" title="Edit">✏️</button>
        <button class="btn-icon btn-delete" data-id="${e.id}" title="Delete">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Totals footer row
  const tfootRow = document.getElementById('table-total-row');
  if (tfootRow) {
    tfootRow.innerHTML = `
      <td colspan="4" class="tfoot-label">Enabled total (${withMonthly.filter(e=>e.enabled).length} items)</td>
      <td class="td-amount tfoot-total">${fmtUSD(total)}</td>
      <td class="td-amount tfoot-total">${fmtSmall(state.calcResult ? state.calcResult.perUser : 0)}</td>
      <td></td>
    `;
  }
}

// ── Scale projector ───────────────────────────────────────────
function renderScaleProjector(users) {
  const el = document.getElementById('scale-results');
  if (!el || !state.project) return;
  const r = calcProject({ ...state.project, monthlyActiveUsers: users });
  el.innerHTML = `
    <div class="scale-grid">
      <div class="scale-item">
        <div class="scale-label">Total Monthly</div>
        <div class="scale-val">${fmtUSD(r.total)}</div>
      </div>
      <div class="scale-item">
        <div class="scale-label">Per User / Month</div>
        <div class="scale-val">${fmtSmall(r.perUser)}</div>
      </div>
      <div class="scale-item">
        <div class="scale-label">Fixed</div>
        <div class="scale-val">${fmtUSD(r.fixed)}</div>
      </div>
      <div class="scale-item">
        <div class="scale-label">Variable</div>
        <div class="scale-val">${fmtUSD(r.variable)}</div>
      </div>
    </div>
  `;
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(existingEntry = null) {
  state.editingCostId = existingEntry ? existingEntry.id : null;
  const modal = document.getElementById('modal');
  const title = document.getElementById('modal-title');
  title.textContent = existingEntry ? 'Edit Cost' : 'Add Cost';

  // Reset form
  const form = document.getElementById('cost-form');
  form.reset();
  document.getElementById('modal-service-select').value = '';

  if (existingEntry) {
    fillFormFromEntry(existingEntry);
  } else {
    // defaults
    document.getElementById('field-billing-type').value = 'fixed_monthly';
    document.getElementById('field-enabled').checked = true;
    document.getElementById('field-seats').value = state.project.developers || 1;
    document.getElementById('field-amortize').value = 12;
    updateBillingFields();
  }

  modal.classList.add('visible');
  document.getElementById('field-name').focus();
}

function closeModal() {
  document.getElementById('modal').classList.remove('visible');
  state.editingCostId = null;
}

function fillFormFromEntry(e) {
  document.getElementById('field-name').value          = e.name || '';
  document.getElementById('field-category').value      = e.category || 'other';
  document.getElementById('field-billing-type').value  = e.billingType || 'fixed_monthly';
  document.getElementById('field-base-amount').value   = e.baseAmount || 0;
  document.getElementById('field-per-user').value      = e.perUserAmount || 0;
  document.getElementById('field-usage-pu').value      = e.usagePerUser || 0;
  document.getElementById('field-unit-cost').value     = e.unitCost || 0;
  document.getElementById('field-unit-label').value    = e.unitLabel || '';
  document.getElementById('field-seats').value         = e.seats || state.project.developers || 1;
  document.getElementById('field-amortize').value      = e.amortizeMonths || 12;
  document.getElementById('field-notes').value         = e.notes || '';
  document.getElementById('field-enabled').checked     = e.enabled !== false;
  updateBillingFields();
}

function fillFormFromCatalogItem(item) {
  document.getElementById('field-name').value          = item.name;
  document.getElementById('field-category').value      = item.category;
  document.getElementById('field-billing-type').value  = item.billingType;
  document.getElementById('field-base-amount').value   = item.baseAmount || 0;
  document.getElementById('field-per-user').value      = item.perUserAmount || 0;
  document.getElementById('field-usage-pu').value      = item.usagePerUser || 0;
  document.getElementById('field-unit-cost').value     = item.unitCost || 0;
  document.getElementById('field-unit-label').value    = item.unitLabel || '';
  document.getElementById('field-seats').value         = state.project.developers || 1;
  document.getElementById('field-amortize').value      = item.amortizeMonths || 12;
  document.getElementById('field-notes').value         = item.description || '';
  document.getElementById('field-enabled').checked     = true;
  updateBillingFields();
}

function updateBillingFields() {
  const bt = document.getElementById('field-billing-type').value;

  // hide all optional rows first
  ['field-base-amount', 'field-per-user', 'field-usage-pu', 'field-unit-cost',
   'field-unit-label', 'field-seats', 'field-amortize'].forEach(id => {
    const row = document.getElementById(id + '-row');
    if (row) row.style.display = 'none';
  });

  if (bt === 'fixed_monthly') {
    showRow('field-base-amount', 'Base Monthly Cost ($)');
  } else if (bt === 'fixed_annual') {
    showRow('field-base-amount', 'Annual Cost ($)');
  } else if (bt === 'per_user') {
    showRow('field-per-user', 'Cost per MAU ($/user/month)');
  } else if (bt === 'usage_per_user') {
    showRow('field-usage-pu', 'Usage per User per Month');
    showRow('field-unit-cost', 'Cost per Unit ($)');
    showRow('field-unit-label', 'Unit Label');
  } else if (bt === 'one_time') {
    showRow('field-base-amount', 'One-Time Cost ($)');
    showRow('field-amortize', 'Amortize Over (months)');
  } else if (bt === 'per_seat') {
    showRow('field-base-amount', 'Cost per Seat/Month ($)');
    showRow('field-seats', 'Number of Seats');
  }
}

function showRow(id, label) {
  const row = document.getElementById(id + '-row');
  if (row) {
    row.style.display = 'grid';
    const lbl = row.querySelector('label');
    if (lbl) lbl.textContent = label;
  }
}

function getFormEntry() {
  const bt = document.getElementById('field-billing-type').value;
  return {
    id: state.editingCostId || null,
    name:          document.getElementById('field-name').value.trim(),
    serviceKey:    document.getElementById('modal-service-select').value || null,
    category:      document.getElementById('field-category').value,
    billingType:   bt,
    baseAmount:    parseFloat(document.getElementById('field-base-amount').value) || 0,
    perUserAmount: parseFloat(document.getElementById('field-per-user').value) || 0,
    usagePerUser:  parseFloat(document.getElementById('field-usage-pu').value) || 0,
    unitCost:      parseFloat(document.getElementById('field-unit-cost').value) || 0,
    unitLabel:     document.getElementById('field-unit-label').value.trim(),
    seats:         parseInt(document.getElementById('field-seats').value, 10) || state.project.developers || 1,
    amortizeMonths:parseInt(document.getElementById('field-amortize').value, 10) || 12,
    notes:         document.getElementById('field-notes').value.trim(),
    enabled:       document.getElementById('field-enabled').checked,
  };
}

// ── Catalog modal ─────────────────────────────────────────────
function openCatalogModal() {
  const modal = document.getElementById('catalog-modal');
  modal.classList.add('visible');
  renderCatalogItems('');
  document.getElementById('catalog-search').value = '';
  document.getElementById('catalog-search').focus();
}

function closeCatalogModal() {
  document.getElementById('catalog-modal').classList.remove('visible');
}

function renderCatalogItems(query) {
  const list = document.getElementById('catalog-list');
  const q = query.toLowerCase();
  const items = q
    ? CATALOG.filter(c => c.name.toLowerCase().includes(q) || c.category.includes(q) || c.description.toLowerCase().includes(q))
    : CATALOG;

  list.innerHTML = '';
  for (const item of items) {
    const catMeta = getCategoryMeta(item.category);
    const div = document.createElement('div');
    div.className = 'catalog-item';
    div.innerHTML = `
      <div class="catalog-item-info">
        <span class="catalog-item-name">${esc(item.name)}</span>
        <span class="badge" style="--badge-color:${catMeta.color}">${catMeta.label}</span>
        <span class="catalog-item-desc">${esc(item.description)}</span>
      </div>
      <button class="btn-add-catalog" data-key="${item.key}">+ Add</button>
    `;
    list.appendChild(div);
  }
}

// ── Project management UI ─────────────────────────────────────
function renderProjectSelect(projects, activeId) {
  const sel = document.getElementById('project-select');
  sel.innerHTML = '';
  for (const p of projects) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === activeId) opt.selected = true;
    sel.appendChild(opt);
  }
}

// ── Sorting ───────────────────────────────────────────────────
function setSortCol(col) {
  if (state.sort.col === col) {
    state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort.col = col;
    state.sort.dir = col === 'monthly' ? 'desc' : 'asc';
  }
  updateSortHeaders();
  renderTable();
}

function updateSortHeaders() {
  document.querySelectorAll('[data-sort]').forEach(th => {
    const col = th.dataset.sort;
    th.classList.toggle('sort-active', col === state.sort.col);
    th.classList.toggle('sort-asc', col === state.sort.col && state.sort.dir === 'asc');
    th.classList.toggle('sort-desc', col === state.sort.col && state.sort.dir === 'desc');
  });
}

// ── Helpers ───────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Full render ───────────────────────────────────────────────
function renderAll() {
  if (!state.project) return;
  const mau  = state.project.monthlyActiveUsers || 0;
  const devs = state.project.developers || 1;
  state.calcResult = calcProject(state.project);
  const scaleData  = calcScale(state.project);

  // Update MAU / devs inputs to match project
  const mauInput  = document.getElementById('mau-input');
  const devsInput = document.getElementById('devs-input');
  const nameInput = document.getElementById('project-name-input');
  if (mauInput  && mauInput  !== document.activeElement) mauInput.value  = mau;
  if (devsInput && devsInput !== document.activeElement) devsInput.value = devs;
  if (nameInput && nameInput !== document.activeElement) nameInput.value = state.project.name;

  renderSummary(state.calcResult);
  renderCategoryChips();
  renderTable();
  renderAllCharts(state.calcResult, scaleData);

  // Update scale projector if open
  const scaleInput = document.getElementById('scale-users');
  if (scaleInput) renderScaleProjector(parseInt(scaleInput.value, 10) || mau);
}
