'use strict';

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  let projects = loadProjects();
  if (projects.length === 0) {
    const p = createProject('My App');
    projects = [p];
  }

  let activeId = getActiveId();
  if (!activeId || !projects.find(p => p.id === activeId)) {
    activeId = projects[0].id;
    setActiveId(activeId);
  }

  state.project = getProject(activeId);
  renderProjectSelect(projects, activeId);
  renderAll();
  bindEvents();
});

// ── Event binding ─────────────────────────────────────────────
function bindEvents() {

  // ── Project controls ───────────────────────────────────────
  document.getElementById('project-select').addEventListener('change', e => {
    setActiveId(e.target.value);
    state.project = getProject(e.target.value);
    renderAll();
  });

  document.getElementById('project-name-input').addEventListener('change', e => {
    state.project.name = e.target.value.trim() || 'My App';
    updateProject(state.project);
    // Update dropdown label
    renderProjectSelect(loadProjects(), state.project.id);
  });

  document.getElementById('new-project-btn').addEventListener('click', () => {
    const name = prompt('Project name:', 'New App');
    if (!name) return;
    const p = createProject(name.trim() || 'New App');
    setActiveId(p.id);
    state.project = p;
    renderProjectSelect(loadProjects(), p.id);
    renderAll();
  });

  document.getElementById('load-demo-btn').addEventListener('click', () => {
    if (!confirm('Load the Firebase + Supabase + Hetzner demo stack into a new project?')) return;
    const demo = loadSampleStack();
    setActiveId(demo.id);
    state.project = demo;
    renderProjectSelect(loadProjects(), demo.id);
    renderAll();
  });

  document.getElementById('delete-project-btn').addEventListener('click', () => {
    const projects = loadProjects();
    if (projects.length <= 1) {
      alert('Cannot delete the only project.');
      return;
    }
    if (!confirm(`Delete project "${state.project.name}"? This cannot be undone.`)) return;
    deleteProject(state.project.id);
    const remaining = loadProjects();
    state.project = remaining[0];
    setActiveId(state.project.id);
    renderProjectSelect(remaining, state.project.id);
    renderAll();
  });

  // ── MAU / devs ────────────────────────────────────────────
  document.getElementById('mau-input').addEventListener('input', e => {
    state.project.monthlyActiveUsers = Math.max(0, parseInt(e.target.value, 10) || 0);
    updateProject(state.project);
    renderAll();
  });

  document.getElementById('devs-input').addEventListener('input', e => {
    state.project.developers = Math.max(1, parseInt(e.target.value, 10) || 1);
    updateProject(state.project);
    renderAll();
  });

  // ── Export / Import ───────────────────────────────────────
  document.getElementById('export-json-btn').addEventListener('click', () => {
    exportJSON(state.project);
  });

  document.getElementById('export-csv-btn').addEventListener('click', () => {
    if (!state.calcResult) return;
    exportCSV(state.project, state.calcResult);
  });

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-input').click();
  });

  document.getElementById('import-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = await importJSON(file);
      state.project = imported;
      setActiveId(imported.id);
      renderProjectSelect(loadProjects(), imported.id);
      renderAll();
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
    e.target.value = '';
  });

  // ── Table filters ─────────────────────────────────────────
  document.getElementById('search-input').addEventListener('input', e => {
    state.filters.search = e.target.value;
    renderTable();
  });

  document.getElementById('billing-filter').addEventListener('change', e => {
    state.filters.billingType = e.target.value;
    renderTable();
  });

  document.getElementById('show-disabled').addEventListener('change', e => {
    state.filters.showDisabled = e.target.checked;
    renderTable();
  });

  // ── Table sort headers ────────────────────────────────────
  document.querySelectorAll('[data-sort]').forEach(th => {
    th.addEventListener('click', () => setSortCol(th.dataset.sort));
  });

  // ── Table row actions (delegated) ─────────────────────────
  document.getElementById('cost-tbody').addEventListener('click', e => {
    const editBtn   = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    const toggle    = e.target.closest('.toggle-cost');

    if (editBtn) {
      const id = editBtn.dataset.id;
      const entry = state.project.costs.find(c => c.id === id);
      if (entry) openModal(entry);
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const entry = state.project.costs.find(c => c.id === id);
      if (entry && confirm(`Delete "${entry.name}"?`)) {
        deleteCost(state.project, id);
        state.project = getProject(state.project.id);
        renderAll();
      }
    }

    if (toggle) {
      const id = toggle.dataset.id;
      toggleCost(state.project, id);
      state.project = getProject(state.project.id);
      renderAll();
    }
  });

  // ── Add cost button ────────────────────────────────────────
  document.getElementById('add-cost-btn').addEventListener('click', () => openModal());

  // ── Modal: billing type change → update fields ─────────────
  document.getElementById('field-billing-type').addEventListener('change', updateBillingFields);

  // ── Modal: load from catalog dropdown ─────────────────────
  document.getElementById('modal-service-select').addEventListener('change', e => {
    const key = e.target.value;
    if (!key) return;
    const item = CATALOG_BY_KEY[key];
    if (item) fillFormFromCatalogItem(item);
  });

  // ── Modal: save ───────────────────────────────────────────
  document.getElementById('cost-form').addEventListener('submit', e => {
    e.preventDefault();
    const entry = getFormEntry();
    if (!entry.name) {
      alert('Please enter a name for this cost.');
      return;
    }
    if (state.editingCostId) {
      entry.id = state.editingCostId;
      updateCost(state.project, entry);
    } else {
      addCost(state.project, entry);
    }
    state.project = getProject(state.project.id);
    closeModal();
    renderAll();
  });

  // ── Modal: cancel ─────────────────────────────────────────
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target.id === 'modal') closeModal();
  });

  // ── Catalog modal ─────────────────────────────────────────
  document.getElementById('open-catalog-btn').addEventListener('click', openCatalogModal);
  document.getElementById('catalog-close').addEventListener('click', closeCatalogModal);
  document.getElementById('catalog-modal').addEventListener('click', e => {
    if (e.target.id === 'catalog-modal') closeCatalogModal();
  });

  document.getElementById('catalog-search').addEventListener('input', e => {
    renderCatalogItems(e.target.value);
  });

  document.getElementById('catalog-list').addEventListener('click', e => {
    const btn = e.target.closest('.btn-add-catalog');
    if (!btn) return;
    const item = CATALOG_BY_KEY[btn.dataset.key];
    if (!item) return;
    const entry = {
      name: item.name,
      serviceKey: item.key,
      category: item.category,
      billingType: item.billingType,
      baseAmount: item.baseAmount || 0,
      perUserAmount: item.perUserAmount || 0,
      usagePerUser: item.usagePerUser || 0,
      unitCost: item.unitCost || 0,
      unitLabel: item.unitLabel || '',
      seats: state.project.developers || 1,
      amortizeMonths: item.amortizeMonths || 12,
      notes: item.description || '',
      enabled: true,
    };
    addCost(state.project, entry);
    state.project = getProject(state.project.id);
    renderAll();

    // visual feedback
    btn.textContent = '✓ Added';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = '+ Add'; btn.disabled = false; }, 1500);
  });

  // ── Scale projector ────────────────────────────────────────
  document.getElementById('scale-users').addEventListener('input', e => {
    renderScaleProjector(parseInt(e.target.value, 10) || 0);
  });

  // ── Keyboard: Escape closes modals ────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeCatalogModal();
    }
  });
}
