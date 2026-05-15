'use strict';

let donutChart = null;
let barChart   = null;
let scaleChart = null;

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { size: 12 }, boxWidth: 12 },
    },
    tooltip: {
      backgroundColor: '#1e2235',
      borderColor: '#2d3354',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      padding: 10,
    },
  },
};

function fmt(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

// ── Donut: cost by category ──────────────────────────────────
function renderDonut(byCategory) {
  const ctx = document.getElementById('chart-donut');
  if (!ctx) return;

  const labels = [], data = [], colors = [];
  for (const cat of CATEGORIES) {
    const val = byCategory[cat.key] || 0;
    if (val > 0) {
      labels.push(cat.label);
      data.push(parseFloat(val.toFixed(2)));
      colors.push(cat.color);
    }
  }

  if (donutChart) donutChart.destroy();

  if (data.length === 0) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    donutChart = null;
    return;
  }

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#0f1117',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      cutout: '65%',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}`,
          },
        },
      },
    },
  });
}

// ── Bar: fixed vs variable ───────────────────────────────────
function renderBar(calcResult) {
  const ctx = document.getElementById('chart-bar');
  if (!ctx) return;

  // breakdown by category, split fixed/variable
  const fixedByCat   = {};
  const varByCat     = {};
  const FIXED_T = new Set(['fixed_monthly', 'fixed_annual', 'per_seat', 'one_time']);

  for (const e of calcResult.entries) {
    const key = e.category;
    if (FIXED_T.has(e.billingType)) {
      fixedByCat[key] = (fixedByCat[key] || 0) + e.monthly;
    } else {
      varByCat[key] = (varByCat[key] || 0) + e.monthly;
    }
  }

  const activeCats = CATEGORIES.filter(c =>
    (fixedByCat[c.key] || 0) + (varByCat[c.key] || 0) > 0
  );

  if (barChart) barChart.destroy();

  if (activeCats.length === 0) {
    barChart = null;
    return;
  }

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: activeCats.map(c => c.label),
      datasets: [
        {
          label: 'Fixed',
          data: activeCats.map(c => parseFloat((fixedByCat[c.key] || 0).toFixed(2))),
          backgroundColor: activeCats.map(c => c.color + 'cc'),
          borderRadius: 4,
        },
        {
          label: 'Variable',
          data: activeCats.map(c => parseFloat((varByCat[c.key] || 0).toFixed(2))),
          backgroundColor: activeCats.map(c => c.color + '44'),
          borderColor: activeCats.map(c => c.color),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: {
          stacked: true,
          ticks: { color: '#64748b' },
          grid: { color: '#1e2235' },
        },
        y: {
          stacked: true,
          ticks: {
            color: '#64748b',
            callback: v => fmt(v),
          },
          grid: { color: '#1e2235' },
        },
      },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` },
        },
      },
    },
  });
}

// ── Line: cost at scale ──────────────────────────────────────
function renderScale(scaleData) {
  const ctx = document.getElementById('chart-scale');
  if (!ctx) return;

  if (scaleChart) scaleChart.destroy();

  scaleChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: scaleData.map(d => d.users >= 1000 ? (d.users / 1000) + 'K' : d.users + ''),
      datasets: [
        {
          label: 'Total Monthly',
          data: scaleData.map(d => parseFloat(d.total.toFixed(2))),
          borderColor: '#00d4aa',
          backgroundColor: '#00d4aa22',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          yAxisID: 'y',
        },
        {
          label: 'Per-User Cost',
          data: scaleData.map(d => parseFloat(d.perUser.toFixed(4))),
          borderColor: '#f472b6',
          backgroundColor: 'transparent',
          borderDash: [4, 3],
          tension: 0.3,
          pointRadius: 3,
          yAxisID: 'y2',
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks: { color: '#64748b' },
          grid: { color: '#1e2235' },
        },
        y: {
          position: 'left',
          ticks: { color: '#64748b', callback: v => fmt(v) },
          grid: { color: '#1e2235' },
        },
        y2: {
          position: 'right',
          ticks: { color: '#f472b6', callback: v => '$' + v.toFixed(3) },
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex === 0) return ` Total: ${fmt(ctx.raw)}`;
              return ` Per user: $${ctx.raw.toFixed(4)}`;
            },
          },
        },
      },
    },
  });
}

function renderAllCharts(calcResult, scaleData) {
  renderDonut(calcResult.byCategory);
  renderBar(calcResult);
  renderScale(scaleData);
}
