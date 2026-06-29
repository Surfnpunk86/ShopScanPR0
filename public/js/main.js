/* ─── Estado global ──────────────────────────────────────────────────────────── */
let auditResult = null;
let activeTab = 'performance';

const STEPS = [
  { id: 'platform', label: 'Plataforma', progress: 10 },
  { id: 'mobile', label: 'Móvil', progress: 28 },
  { id: 'desktop', label: 'Desktop', progress: 46 },
  { id: 'seo', label: 'SEO', progress: 60 },
  { id: 'cro', label: 'CRO', progress: 74 },
  { id: 'paidmedia', label: 'Paid Media', progress: 88 },
  { id: 'ai', label: 'Análisis IA', progress: 96 },
];

// ─── Inicialización ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  setupEnterKey();
  setupTabs();
});

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    if (cfg.agency?.name) {
      document.querySelectorAll('#footer-agency').forEach(el => {
        el.textContent = `Desarrollado por ${cfg.agency.name}`;
      });
    }
  } catch (e) {}
}

function setupEnterKey() {
  document.getElementById('url-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startAudit();
  });
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      if (auditResult) renderTabContent(activeTab, auditResult);
    });
  });
}

// ─── Auditoría ─────────────────────────────────────────────────────────────────
async function startAudit() {
  const input = document.getElementById('url-input');
  let url = input.value.trim();

  if (!url) {
    input.focus();
    input.style.borderColor = 'var(--accent)';
    setTimeout(() => input.style.borderColor = '', 1500);
    return;
  }

  if (!url.startsWith('http')) url = 'https://' + url;

  // UI: mostrar progress, ocultar form
  document.getElementById('audit-form').classList.add('hidden');
  document.getElementById('progress-card').classList.remove('hidden');
  document.getElementById('results-section').classList.add('hidden');

  // Inicializar progress steps
  const stepsEl = document.getElementById('progress-steps');
  stepsEl.innerHTML = STEPS.map(s =>
    `<span class="step-pill" id="pill-${s.id}">${s.label}</span>`
  ).join('');

  try {
    const eventSource = new EventSource('/dummy'); // fallback
    await runWithFetch(url);
  } catch (err) {
    showError(err.message);
  }
}

async function runWithFetch(url) {
  const response = await fetch('/api/audit/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') {
          onAuditComplete();
          return;
        }
        try {
          const event = JSON.parse(raw);
          handleProgressEvent(event);
        } catch (e) {}
      }
    }
  }
}

function handleProgressEvent(event) {
  const { step, message, data } = event;

  document.getElementById('progress-msg').textContent = message;

  if (step === 'start') return;

  if (step === 'complete' && data) {
    auditResult = data;
    return;
  }

  if (step === 'error') {
    showError(message);
    return;
  }

  // Actualizar pills y barra
  const stepInfo = STEPS.find(s => s.id === step);
  if (stepInfo) {
    updateProgressBar(stepInfo.progress);

    // Marcar anteriores como done
    STEPS.forEach(s => {
      const pill = document.getElementById(`pill-${s.id}`);
      if (!pill) return;
      if (s.progress < stepInfo.progress) {
        pill.className = 'step-pill done';
      } else if (s.id === step) {
        pill.className = 'step-pill active';
      }
    });
  }
}

function onAuditComplete() {
  updateProgressBar(100);
  STEPS.forEach(s => {
    const pill = document.getElementById(`pill-${s.id}`);
    if (pill) pill.className = 'step-pill done';
  });

  setTimeout(() => {
    document.getElementById('progress-card').classList.add('hidden');
    renderResults(auditResult);
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 600);
}

function updateProgressBar(pct) {
  document.getElementById('progress-bar').style.width = pct + '%';
}

// ─── Renderizado de resultados ─────────────────────────────────────────────────
function renderResults(data) {
  document.getElementById('results-url').textContent = data.url;

  renderScoreHero(data);
  renderAISummary(data);
  renderScoresGrid(data);
  renderTabContent(activeTab, data);
}

function renderScoreHero(data) {
  const score = data.ai?.puntuacion_general || 0;
  const level = data.ai?.nivel || 'regular';
  const color = scoreColor(score);
  const summary = data.ai?.resumen_ejecutivo || '';

  document.getElementById('score-hero').innerHTML = `
    <div class="score-big">
      <div class="number" style="color:${color}">${score}</div>
      <div class="label">Score general</div>
    </div>
    <div class="score-divider"></div>
    <div class="score-info">
      <div class="score-level" style="text-transform:capitalize">${level.charAt(0).toUpperCase() + level.slice(1)}</div>
      <div class="score-summary">${summary}</div>
      ${data.platform ? `<div style="margin-top:10px; font-size:13px; color:rgba(255,255,255,.4)">${data.platform.icon || ''} Plataforma: <strong style="color:rgba(255,255,255,.7)">${data.platform.platform}</strong></div>` : ''}
    </div>
  `;
}

function renderAISummary(data) {
  const benchEl = document.getElementById('ai-summary');
  if (!data.ai?.benchmark_latam) { benchEl.classList.add('hidden'); return; }
  benchEl.classList.remove('hidden');
  benchEl.innerHTML = `
    <div class="ai-summary-header">📊 Benchmark LATAM — Análisis con IA</div>
    <div class="ai-summary-text">${data.ai.benchmark_latam}</div>
  `;
}

function renderScoresGrid(data) {
  const modules = [
    { label: 'Performance Móvil', value: data.mobile?.scores?.performance, icon: '📱' },
    { label: 'Performance Desktop', value: data.desktop?.scores?.performance, icon: '💻' },
    { label: 'SEO', value: data.mobile?.scores?.seo, icon: '🔍' },
    { label: 'Accesibilidad', value: data.mobile?.scores?.accessibility, icon: '♿' },
    { label: 'CRO', value: data.cro?.score, icon: '🎯' },
    { label: 'Paid Media', value: data.paidMedia?.score, icon: '📢' },
  ];

  document.getElementById('scores-grid').innerHTML = modules.map(m => {
    const v = m.value || 0;
    const col = scoreColor(v);
    return `
      <div class="score-card" style="border-top-color:${col}">
        <div class="sc-number" style="color:${col}">${v}</div>
        <div class="sc-label">${m.icon} ${m.label}</div>
        <div class="sc-bar"><div class="sc-bar-fill" style="width:${v}%; background:${col}"></div></div>
      </div>
    `;
  }).join('');
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────
function renderTabContent(tab, data) {
  const el = document.getElementById('tab-content');
  switch (tab) {
    case 'performance': el.innerHTML = renderPerformance(data); break;
    case 'seo': el.innerHTML = renderSEO(data); break;
    case 'cro': el.innerHTML = renderCRO(data); break;
    case 'paidmedia': el.innerHTML = renderPaidMedia(data); break;
    case 'action': el.innerHTML = renderActionPlan(data); break;
  }
}

function renderPerformance(data) {
  let html = '';
  ['mobile', 'desktop'].forEach(device => {
    const d = data[device];
    const deviceLabel = device === 'mobile' ? '📱 Móvil' : '💻 Desktop';
    if (!d || d.error) {
      html += `<p style="color:var(--text-light); margin-bottom:24px">${deviceLabel}: No disponible</p>`;
      return;
    }

    html += `<h3 style="font-size:16px; font-weight:600; margin-bottom:16px">${deviceLabel}</h3>`;

    // Vitals
    const vitals = d.coreWebVitals || {};
    if (Object.keys(vitals).length > 0) {
      html += `<div class="vitals-grid">`;
      Object.entries(vitals).forEach(([key, v]) => {
        if (!v || !v.label) return;
        const cat = v.category || 'NEEDS_IMPROVEMENT';
        html += `
          <div class="vital-card">
            <div class="vital-value">${v.value}</div>
            <div class="vital-label">${v.label}</div>
            <div class="vital-status status-${cat}">${cat === 'GOOD' ? 'Bueno' : cat === 'NEEDS_IMPROVEMENT' ? 'Mejorar' : 'Crítico'}</div>
          </div>
        `;
      });
      html += `</div>`;
    }

    // Opportunities
    if (d.opportunities?.length > 0) {
      html += `<p style="font-size:13px; font-weight:600; color:var(--text-light); text-transform:uppercase; letter-spacing:.05em; margin-bottom:10px">Oportunidades de mejora</p>`;
      html += `<div class="check-list">`;
      d.opportunities.forEach(op => {
        const cls = op.impact === 'alto' ? 'fail' : op.impact === 'medio' ? 'warn' : 'pass';
        html += `
          <div class="check-item ${cls}">
            <div class="check-body">
              <div class="check-title">${op.title}</div>
              ${op.displayValue ? `<div class="check-rec">${op.displayValue}</div>` : ''}
            </div>
            <span class="impact-badge impact-${op.impact}">${op.impact}</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `<hr style="border:none; border-top:1px solid var(--border); margin:28px 0">`;
  });
  return html;
}

function renderSEO(data) {
  const seo = data.seo;
  if (!seo || seo.error) return `<p style="color:var(--text-light)">No se pudo analizar SEO</p>`;

  const checks = [
    { label: 'Meta Title', value: seo.title?.value || '—', status: seo.title?.status, detail: `${seo.title?.length || 0} caracteres` },
    { label: 'Meta Description', value: (seo.metaDescription?.value || '—').substring(0, 100) + (seo.metaDescription?.value?.length > 100 ? '…' : ''), status: seo.metaDescription?.status, detail: `${seo.metaDescription?.length || 0} caracteres` },
    { label: 'H1', value: seo.h1?.values?.[0] || '—', status: seo.h1?.status === 'bueno' ? 'bueno' : seo.h1?.count === 0 ? 'faltante' : seo.h1?.status, detail: `${seo.h1?.count || 0} etiqueta(s)` },
    { label: 'URL Canónica', value: seo.canonicalUrl || 'No configurada', status: seo.canonicalUrl ? 'bueno' : 'faltante', detail: '' },
    { label: 'Open Graph', value: seo.ogTags?.title ? 'Configurado' : 'No encontrado', status: seo.ogTags?.title ? 'bueno' : 'mejorable', detail: 'Tags para redes sociales' },
    { label: 'Datos estructurados', value: seo.structuredData ? 'Detectados' : 'No encontrados', status: seo.structuredData ? 'bueno' : 'mejorable', detail: 'JSON-LD / Schema.org' },
    { label: 'Imágenes sin Alt', value: `${seo.images?.withoutAlt || 0} de ${seo.images?.total || 0}`, status: (seo.images?.withoutAlt || 0) === 0 ? 'bueno' : 'mejorable', detail: '' },
    { label: 'Hreflang', value: (seo.hreflang || 0) > 0 ? `${seo.hreflang} tags` : 'Sin configurar', status: (seo.hreflang || 0) > 0 ? 'bueno' : 'informativo', detail: 'Idioma / región' },
  ];

  const statusIcon = s => s === 'bueno' ? '✅' : s === 'faltante' ? '❌' : '⚠️';

  return `
    <div class="seo-grid">
      ${checks.map(c => `
        <div class="seo-item ${c.status}">
          <div>
            <div class="seo-label">${statusIcon(c.status)} ${c.label}</div>
            ${c.detail ? `<div style="font-size:11px; color:var(--text-muted); margin-top:2px">${c.detail}</div>` : ''}
          </div>
          <div class="seo-value">${c.value}</div>
          <div class="seo-status" style="color:${c.status === 'bueno' ? 'var(--success)' : c.status === 'faltante' ? 'var(--danger)' : 'var(--warning)'}">
            ${c.status === 'bueno' ? 'OK' : c.status === 'faltante' ? 'Falta' : 'Mejorar'}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCRO(data) {
  const cro = data.cro;
  if (!cro || cro.error) return `<p style="color:var(--text-light)">No se pudo completar el análisis CRO</p>`;

  const categories = [...new Set(cro.checks.map(c => c.category))];

  return `
    ${categories.map(cat => `
      <div class="cat-header">${cat}</div>
      <div class="check-list" style="margin-bottom:16px">
        ${cro.checks.filter(c => c.category === cat).map(c => `
          <div class="check-item ${c.status}">
            <div class="check-icon">${c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚠️'}</div>
            <div class="check-body">
              <div class="check-title">${c.title}</div>
              ${c.status !== 'pass' ? `<div class="check-rec">${c.recommendation}</div>` : ''}
            </div>
            <span class="impact-badge impact-${c.impact}">${c.impact}</span>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

function renderPaidMedia(data) {
  const pm = data.paidMedia;
  if (!pm || pm.error) return `<p style="color:var(--text-light)">No se pudo completar el análisis de Paid Media</p>`;

  const categories = [...new Set(pm.checks.map(c => c.category))];

  return `
    ${categories.map(cat => `
      <div class="cat-header">${cat}</div>
      <div class="check-list" style="margin-bottom:16px">
        ${pm.checks.filter(c => c.category === cat).map(c => `
          <div class="check-item ${c.status}">
            <div class="check-icon">${c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚠️'}</div>
            <div class="check-body">
              <div class="check-title">${c.title}</div>
              ${c.status !== 'pass' ? `<div class="check-rec">${c.recommendation}</div>` : ''}
            </div>
            <span class="impact-badge impact-${c.impact === 'crítico' ? 'alto' : c.impact}">${c.impact}</span>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

function renderActionPlan(data) {
  const ai = data.ai;
  if (!ai?.prioridades?.length) return `<p style="color:var(--text-light)">No hay plan de acción disponible</p>`;

  const colors = ['#e94560', '#7c3aed', '#3b82f6', '#059669', '#f59e0b'];

  return `
    <div class="action-list">
      ${ai.prioridades.map((p, i) => `
        <div class="action-item">
          <div class="action-num" style="background:${colors[i % colors.length]}">${i + 1}</div>
          <div class="action-body">
            <div class="action-title">${p.titulo}</div>
            <div class="action-badges">
              <span class="badge" style="background:${p.impacto === 'alto' ? '#fee2e2' : p.impacto === 'medio' ? '#fef3c7' : '#d1fae5'}; color:${p.impacto === 'alto' ? '#dc2626' : p.impacto === 'medio' ? '#d97706' : '#059669'}">
                Impacto: ${p.impacto}
              </span>
              <span class="badge" style="background:${p.esfuerzo === 'bajo' ? '#d1fae5' : p.esfuerzo === 'medio' ? '#fef3c7' : '#fee2e2'}; color:${p.esfuerzo === 'bajo' ? '#059669' : p.esfuerzo === 'medio' ? '#d97706' : '#dc2626'}">
                Esfuerzo: ${p.esfuerzo}
              </span>
            </div>
            <div class="action-desc">${p.descripcion}</div>
            ${p.impacto_estimado ? `<div class="action-impact">→ ${p.impacto_estimado}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    ${ai.oportunidades_rapidas?.length ? `
      <div class="quick-wins">
        <h3>⚡ Victorias Rápidas — Menos de 1 hora</h3>
        ${ai.oportunidades_rapidas.map(o => `<div class="quick-win-item">${o}</div>`).join('')}
      </div>
    ` : ''}
  `;
}

// ─── PDF ───────────────────────────────────────────────────────────────────────
async function downloadPDF() {
  if (!auditResult) return;

  const btn = document.querySelector('.btn-secondary');
  const orig = btn.textContent;
  btn.textContent = '⏳ Generando PDF...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/report/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditData: auditResult }),
    });

    if (!res.ok) throw new Error('Error generando PDF');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShopScan-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Error generando PDF: ' + err.message);
  } finally {
    btn.textContent = orig;
    btn.disabled = false;
  }
}

// ─── Reset ─────────────────────────────────────────────────────────────────────
function resetForm() {
  auditResult = null;
  document.getElementById('results-section').classList.add('hidden');
  document.getElementById('progress-card').classList.add('hidden');
  document.getElementById('audit-form').classList.remove('hidden');
  document.getElementById('url-input').value = '';
  document.getElementById('btn-analyze').disabled = false;
  document.querySelector('.hero').scrollIntoView({ behavior: 'smooth' });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 90) return '#10b981';
  if (score >= 75) return '#3b82f6';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function showError(msg) {
  document.getElementById('progress-card').classList.add('hidden');
  document.getElementById('audit-form').classList.remove('hidden');
  document.getElementById('btn-analyze').disabled = false;

  const input = document.getElementById('url-input');
  input.style.borderColor = '#ef4444';
  setTimeout(() => input.style.borderColor = '', 3000);

  alert('Error: ' + msg + '\n\nVerifica que la URL sea válida y la tienda sea accesible.');
}
