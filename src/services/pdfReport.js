const PDFDocument = require('pdfkit');

// ─── Paleta de colores ────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1a1a2e',
  accent: '#e94560',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  white: '#ffffff',
  text: '#111827',
  textLight: '#6b7280',
};

function hexToRGB(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function scoreColor(score) {
  if (score >= 90) return COLORS.success;
  if (score >= 75) return COLORS.info;
  if (score >= 60) return COLORS.warning;
  if (score >= 40) return '#f97316';
  return COLORS.danger;
}

// ─── Generador de PDF ─────────────────────────────────────────────────────────
function generatePDFReport(auditData, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `ShopScan Pro — Diagnóstico de ${auditData.url}`,
      Author: process.env.AGENCY_NAME || 'LaFête América',
      Subject: 'Diagnóstico de Ecommerce',
      Keywords: 'ecommerce, diagnóstico, CRO, SEO, performance',
    },
  });

  // Stream to response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ShopScan-${new Date().toISOString().slice(0, 10)}.pdf"`
  );
  doc.pipe(res);

  const pageWidth = doc.page.width - 100; // margins
  const agencyName = process.env.AGENCY_NAME || 'LaFête América';
  const agencyColor = process.env.AGENCY_COLOR || COLORS.primary;

  // ── PÁGINA 1: Portada ─────────────────────────────────────────────────────
  drawCover(doc, auditData, agencyName, agencyColor, pageWidth);
  doc.addPage();

  // ── PÁGINA 2: Resumen Ejecutivo ───────────────────────────────────────────
  drawExecutiveSummary(doc, auditData, pageWidth, agencyColor);
  doc.addPage();

  // ── PÁGINA 3: Performance & Core Web Vitals ───────────────────────────────
  drawPerformancePage(doc, auditData, pageWidth);
  doc.addPage();

  // ── PÁGINA 4: SEO ──────────────────────────────────────────────────────────
  drawSEOPage(doc, auditData, pageWidth);
  doc.addPage();

  // ── PÁGINA 5: CRO ──────────────────────────────────────────────────────────
  drawCROPage(doc, auditData, pageWidth);
  doc.addPage();

  // ── PÁGINA 6: Paid Media ───────────────────────────────────────────────────
  drawPaidMediaPage(doc, auditData, pageWidth);
  doc.addPage();

  // ── PÁGINA 7: Plan de Acción ───────────────────────────────────────────────
  drawActionPlan(doc, auditData, pageWidth, agencyColor);

  // ── Footer en todas las páginas ────────────────────────────────────────────
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    drawFooter(doc, agencyName, i + 1, pages.count);
  }

  doc.end();
}

// ─── Portada ──────────────────────────────────────────────────────────────────
function drawCover(doc, data, agencyName, agencyColor, pageWidth) {
  const [r, g, b] = hexToRGB(agencyColor);
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(`rgb(${r},${g},${b})`);

  // Overlay pattern (geometric)
  doc.opacity(0.05);
  for (let i = 0; i < 8; i++) {
    doc.rect(50 + i * 80, 50 + i * 60, 200, 200).stroke('#ffffff');
  }
  doc.opacity(1);

  // Logo área
  doc.rect(50, 50, 120, 40).fill(COLORS.accent);
  doc.fillColor(COLORS.white).fontSize(16).font('Helvetica-Bold').text(agencyName, 55, 60, { width: 110, align: 'center' });

  // Título principal
  doc.fillColor(COLORS.white)
    .fontSize(42)
    .font('Helvetica-Bold')
    .text('ShopScan', 50, 200)
    .fontSize(42)
    .fillColor(COLORS.accent)
    .text('Pro', 50, 245);

  doc.fillColor(COLORS.white)
    .fontSize(18)
    .font('Helvetica')
    .text('Diagnóstico Integral de Ecommerce', 50, 305);

  // Línea divisora
  doc.moveTo(50, 340).lineTo(doc.page.width - 50, 340).strokeColor(COLORS.accent).lineWidth(2).stroke();

  // URL analizada
  doc.fillColor(COLORS.white).fontSize(14).font('Helvetica').text('Tienda analizada:', 50, 360);
  doc.fillColor(COLORS.accent).fontSize(16).font('Helvetica-Bold').text(data.url, 50, 380, { width: pageWidth });

  // Score general
  const generalScore = data.ai?.puntuacion_general || 0;
  const scoreCol = scoreColor(generalScore);
  const [sr, sg, sb] = hexToRGB(scoreCol);
  doc.rect(50, 430, 140, 140).fill(`rgb(${sr},${sg},${sb})`);
  doc.fillColor(COLORS.white).fontSize(64).font('Helvetica-Bold').text(`${generalScore}`, 50, 455, { width: 140, align: 'center' });
  doc.fillColor(COLORS.white).fontSize(14).font('Helvetica').text('Score General', 50, 530, { width: 140, align: 'center' });

  // Scores individuales
  const scores = [
    { label: 'Performance', value: data.mobile?.scores?.performance || 0 },
    { label: 'SEO', value: data.mobile?.scores?.seo || 0 },
    { label: 'CRO', value: data.cro?.score || 0 },
    { label: 'Paid Media', value: data.paidMedia?.score || 0 },
  ];

  scores.forEach((s, i) => {
    const x = 220 + i * 85;
    const col = scoreColor(s.value);
    const [cr, cg, cb] = hexToRGB(col);
    doc.rect(x, 450, 75, 75).fill(`rgba(${cr},${cg},${cb},0.2)`).strokeColor(`rgb(${cr},${cg},${cb})`).lineWidth(1).stroke();
    doc.fillColor(`rgb(${cr},${cg},${cb})`).fontSize(28).font('Helvetica-Bold').text(`${s.value}`, x, 463, { width: 75, align: 'center' });
    doc.fillColor(COLORS.white).fontSize(10).font('Helvetica').text(s.label, x, 505, { width: 75, align: 'center' });
  });

  // Fecha
  doc.fillColor('rgba(255,255,255,0.5)')
    .fontSize(11)
    .font('Helvetica')
    .text(`Generado el ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, doc.page.height - 80, { width: pageWidth });
}

// ─── Resumen ejecutivo ────────────────────────────────────────────────────────
function drawExecutiveSummary(doc, data, pageWidth, agencyColor) {
  drawPageHeader(doc, 'Resumen Ejecutivo', agencyColor, pageWidth);

  let y = 130;

  // Resumen IA
  if (data.ai?.resumen_ejecutivo) {
    doc.rect(50, y, pageWidth, 70).fill(COLORS.lightGray);
    doc.fillColor(COLORS.text).fontSize(12).font('Helvetica').text(data.ai.resumen_ejecutivo, 65, y + 15, { width: pageWidth - 30, lineGap: 4 });
    y += 90;
  }

  // Cuadro de 4 scores
  y += 10;
  doc.fillColor(COLORS.text).fontSize(14).font('Helvetica-Bold').text('Diagnóstico por Módulo', 50, y);
  y += 25;

  const modules = [
    { label: 'Performance Móvil', score: data.mobile?.scores?.performance || 0, icon: '📱' },
    { label: 'Performance Desktop', score: data.desktop?.scores?.performance || 0, icon: '💻' },
    { label: 'SEO', score: data.mobile?.scores?.seo || 0, icon: '🔍' },
    { label: 'Accesibilidad', score: data.mobile?.scores?.accessibility || 0, icon: '♿' },
    { label: 'CRO', score: data.cro?.score || 0, icon: '🎯' },
    { label: 'Paid Media', score: data.paidMedia?.score || 0, icon: '📢' },
  ];

  modules.forEach((m, i) => {
    const col = i % 2 === 0 ? 50 : 300;
    const row = Math.floor(i / 2);
    const rowY = y + row * 60;
    const scoreCol = scoreColor(m.score);
    const [sr, sg, sb] = hexToRGB(scoreCol);

    doc.rect(col, rowY, 230, 50).fill(COLORS.lightGray);
    doc.rect(col, rowY, 6, 50).fill(`rgb(${sr},${sg},${sb})`);
    doc.fillColor(COLORS.text).fontSize(11).font('Helvetica-Bold').text(m.label, col + 15, rowY + 10, { width: 150 });
    doc.fillColor(`rgb(${sr},${sg},${sb})`).fontSize(20).font('Helvetica-Bold').text(`${m.score}`, col + 185, rowY + 12, { width: 40, align: 'right' });
    doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text('/100', col + 205, rowY + 20);

    // Barra de progreso
    doc.rect(col + 15, rowY + 35, 180, 5).fill('#e5e7eb');
    doc.rect(col + 15, rowY + 35, Math.round(180 * m.score / 100), 5).fill(`rgb(${sr},${sg},${sb})`);
  });

  y += 190;

  // Oportunidades rápidas
  if (data.ai?.oportunidades_rapidas?.length > 0) {
    doc.fillColor(COLORS.text).fontSize(14).font('Helvetica-Bold').text('⚡ Victorias Rápidas (menos de 1 hora)', 50, y);
    y += 20;
    data.ai.oportunidades_rapidas.forEach((op, i) => {
      doc.rect(50, y, 8, 8).fill(COLORS.accent);
      doc.fillColor(COLORS.text).fontSize(11).font('Helvetica').text(op, 70, y - 1, { width: pageWidth - 20 });
      y += 20;
    });
  }

  // Benchmark LATAM
  if (data.ai?.benchmark_latam) {
    y += 10;
    doc.rect(50, y, pageWidth, 60).fill('#eff6ff');
    doc.rect(50, y, 4, 60).fill(COLORS.info);
    doc.fillColor(COLORS.info).fontSize(11).font('Helvetica-Bold').text('📊 Benchmark LATAM', 65, y + 10);
    doc.fillColor(COLORS.text).fontSize(10).font('Helvetica').text(data.ai.benchmark_latam, 65, y + 26, { width: pageWidth - 30 });
  }
}

// ─── Performance ──────────────────────────────────────────────────────────────
function drawPerformancePage(doc, data, pageWidth) {
  drawPageHeader(doc, 'Performance & Core Web Vitals', '#7c3aed', pageWidth);
  let y = 130;

  ['mobile', 'desktop'].forEach((device) => {
    const perf = data[device];
    if (!perf || perf.error) return;

    const deviceLabel = device === 'mobile' ? '📱 Móvil' : '💻 Desktop';
    doc.fillColor(COLORS.text).fontSize(13).font('Helvetica-Bold').text(deviceLabel, 50, y);
    y += 20;

    // Scores
    const scoreItems = [
      { label: 'Performance', value: perf.scores?.performance || 0 },
      { label: 'SEO', value: perf.scores?.seo || 0 },
      { label: 'Best Practices', value: perf.scores?.bestPractices || 0 },
      { label: 'Accesibilidad', value: perf.scores?.accessibility || 0 },
    ];

    scoreItems.forEach((s, i) => {
      const x = 50 + i * 125;
      const col = scoreColor(s.value);
      const [sr, sg, sb] = hexToRGB(col);
      doc.rect(x, y, 115, 55).fill(COLORS.lightGray);
      doc.fillColor(`rgb(${sr},${sg},${sb})`).fontSize(26).font('Helvetica-Bold').text(`${s.value}`, x, y + 8, { width: 115, align: 'center' });
      doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text(s.label, x, y + 38, { width: 115, align: 'center' });
    });
    y += 70;

    // Core Web Vitals
    if (perf.coreWebVitals && Object.keys(perf.coreWebVitals).length > 0) {
      const vitals = Object.entries(perf.coreWebVitals).slice(0, 5);
      vitals.forEach(([key, vital]) => {
        if (!vital || !vital.label) return;
        const isGood = vital.category === 'GOOD';
        const isNeedWork = vital.category === 'NEEDS_IMPROVEMENT';
        const vColor = isGood ? COLORS.success : isNeedWork ? COLORS.warning : COLORS.danger;
        const [vr, vg, vb] = hexToRGB(vColor);

        doc.rect(50, y, pageWidth, 24).fill(COLORS.lightGray);
        doc.rect(50, y, 4, 24).fill(`rgb(${vr},${vg},${vb})`);
        doc.fillColor(COLORS.text).fontSize(10).font('Helvetica').text(vital.label, 62, y + 7, { width: 250 });
        doc.fillColor(`rgb(${vr},${vg},${vb})`).fontSize(10).font('Helvetica-Bold').text(String(vital.value), 310, y + 7, { width: 100, align: 'right' });
        doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text(vital.category || '', 420, y + 8, { width: 120, align: 'right' });
        y += 28;
      });
    }

    y += 15;

    // Top oportunidades
    if (perf.opportunities?.length > 0) {
      doc.fillColor(COLORS.text).fontSize(11).font('Helvetica-Bold').text('Oportunidades de mejora:', 50, y);
      y += 15;
      perf.opportunities.slice(0, 4).forEach((op) => {
        const impactCol = op.impact === 'alto' ? COLORS.danger : op.impact === 'medio' ? COLORS.warning : COLORS.success;
        const [ir, ig, ib] = hexToRGB(impactCol);
        doc.rect(50, y, 70, 16).fill(`rgb(${ir},${ig},${ib})`);
        doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold').text(op.impact.toUpperCase(), 50, y + 4, { width: 70, align: 'center' });
        doc.fillColor(COLORS.text).fontSize(9).font('Helvetica').text(op.title, 130, y + 4, { width: pageWidth - 80 });
        y += 22;
      });
    }

    y += 20;
  });
}

// ─── SEO ──────────────────────────────────────────────────────────────────────
function drawSEOPage(doc, data, pageWidth) {
  drawPageHeader(doc, 'Análisis SEO', '#059669', pageWidth);
  const seo = data.seo;
  let y = 130;

  if (!seo || seo.error) {
    doc.fillColor(COLORS.textLight).text('No se pudo obtener datos SEO de la página.', 50, y);
    return;
  }

  const seoChecks = [
    { label: 'Meta Title', value: seo.title?.value || 'No encontrado', status: seo.title?.status, detail: `${seo.title?.length || 0} caracteres (óptimo: 30-60)` },
    { label: 'Meta Description', value: seo.metaDescription?.value?.substring(0, 80) + '...' || 'No encontrada', status: seo.metaDescription?.status, detail: `${seo.metaDescription?.length || 0} caracteres (óptimo: 120-160)` },
    { label: 'H1', value: seo.h1?.values?.[0] || 'No encontrado', status: seo.h1?.status === 'bueno' ? 'bueno' : seo.h1?.status, detail: `${seo.h1?.count || 0} etiqueta(s) H1` },
    { label: 'Imágenes sin Alt', value: `${seo.images?.withoutAlt || 0} de ${seo.images?.total || 0}`, status: seo.images?.withoutAlt === 0 ? 'bueno' : 'mejorable', detail: 'Imágenes sin texto alternativo' },
    { label: 'URL Canónica', value: seo.canonicalUrl || 'No configurada', status: seo.canonicalUrl ? 'bueno' : 'faltante', detail: '' },
    { label: 'Datos Estructurados', value: seo.structuredData ? 'Detectados' : 'No encontrados', status: seo.structuredData ? 'bueno' : 'mejorable', detail: 'Schema.org / JSON-LD' },
    { label: 'Open Graph', value: seo.ogTags?.title ? 'Configurado' : 'Faltante', status: seo.ogTags?.title ? 'bueno' : 'mejorable', detail: 'Tags para redes sociales' },
    { label: 'Hreflang', value: seo.hreflang > 0 ? `${seo.hreflang} tags` : 'No configurado', status: seo.hreflang > 0 ? 'bueno' : 'informativo', detail: 'Idiomas/países configurados' },
  ];

  seoChecks.forEach((check) => {
    const statusColor = check.status === 'bueno' ? COLORS.success : check.status === 'faltante' ? COLORS.danger : COLORS.warning;
    const [sr, sg, sb] = hexToRGB(statusColor);

    doc.rect(50, y, pageWidth, 40).fill(COLORS.lightGray);
    doc.rect(50, y, 4, 40).fill(`rgb(${sr},${sg},${sb})`);
    doc.fillColor(COLORS.text).fontSize(10).font('Helvetica-Bold').text(check.label, 62, y + 5, { width: 120 });
    doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text(check.detail, 62, y + 22, { width: 150 });
    doc.fillColor(COLORS.text).fontSize(9).font('Helvetica').text(String(check.value).substring(0, 60), 220, y + 14, { width: pageWidth - 180 });

    const statusLabel = check.status === 'bueno' ? '✓ OK' : check.status === 'faltante' ? '✗ Falta' : '⚠ Mejorar';
    doc.fillColor(`rgb(${sr},${sg},${sb})`).fontSize(9).font('Helvetica-Bold').text(statusLabel, 460, y + 14, { width: 70, align: 'right' });

    y += 48;
  });
}

// ─── CRO ──────────────────────────────────────────────────────────────────────
function drawCROPage(doc, data, pageWidth) {
  drawPageHeader(doc, 'Optimización de Conversión (CRO)', '#dc2626', pageWidth);
  const cro = data.cro;
  let y = 130;

  if (!cro || cro.error) {
    doc.fillColor(COLORS.textLight).text('No se pudo completar el análisis CRO.', 50, y);
    return;
  }

  // Score CRO
  const col = scoreColor(cro.score);
  const [cr, cg, cb] = hexToRGB(col);
  doc.rect(50, y, 150, 80).fill(`rgb(${cr},${cg},${cb})`);
  doc.fillColor(COLORS.white).fontSize(48).font('Helvetica-Bold').text(`${cro.score}`, 50, y + 8, { width: 150, align: 'center' });
  doc.fillColor(COLORS.white).fontSize(12).font('Helvetica').text('Score CRO', 50, y + 58, { width: 150, align: 'center' });

  doc.fillColor(COLORS.text).fontSize(12).font('Helvetica').text(`${cro.passed} de ${cro.totalChecks} verificaciones aprobadas`, 220, y + 20);
  doc.fillColor(COLORS.danger).fontSize(11).text(`${cro.failed} críticos`, 220, y + 40);
  doc.fillColor(COLORS.warning).fontSize(11).text(`${cro.warnings} advertencias`, 220, y + 58);

  y += 100;

  // Lista de checks
  const categories = [...new Set(cro.checks.map((c) => c.category))];
  categories.forEach((cat) => {
    doc.fillColor(COLORS.text).fontSize(11).font('Helvetica-Bold').text(cat, 50, y);
    y += 18;

    cro.checks.filter((c) => c.category === cat).forEach((check) => {
      const statusColor = check.status === 'pass' ? COLORS.success : check.status === 'fail' ? COLORS.danger : COLORS.warning;
      const statusIcon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '!';
      const [sr, sg, sb] = hexToRGB(statusColor);

      doc.rect(50, y, pageWidth, 35).fill(COLORS.lightGray);
      doc.fillColor(`rgb(${sr},${sg},${sb})`).fontSize(12).font('Helvetica-Bold').text(statusIcon, 55, y + 11, { width: 15 });
      doc.fillColor(COLORS.text).fontSize(10).font('Helvetica-Bold').text(check.title, 78, y + 6, { width: 260 });
      const impactCol = check.impact === 'alto' ? COLORS.danger : check.impact === 'medio' ? COLORS.warning : COLORS.success;
      const [ir, ig, ib] = hexToRGB(impactCol);
      doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica').text(`Impacto: `, 78, y + 22);
      doc.fillColor(`rgb(${ir},${ig},${ib})`).text(check.impact, 120, y + 22);

      if (check.status !== 'pass') {
        doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica').text(check.recommendation.substring(0, 120), 350, y + 11, { width: 195 });
      }

      y += 40;
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 60;
      }
    });
    y += 5;
  });
}

// ─── Paid Media ───────────────────────────────────────────────────────────────
function drawPaidMediaPage(doc, data, pageWidth) {
  drawPageHeader(doc, 'Tracking & Paid Media', '#7c3aed', pageWidth);
  const pm = data.paidMedia;
  let y = 130;

  if (!pm || pm.error) {
    doc.fillColor(COLORS.textLight).text('No se pudo completar el análisis de Paid Media.', 50, y);
    return;
  }

  // Score
  const col = scoreColor(pm.score);
  const [cr, cg, cb] = hexToRGB(col);
  doc.rect(50, y, 150, 80).fill(`rgb(${cr},${cg},${cb})`);
  doc.fillColor(COLORS.white).fontSize(48).font('Helvetica-Bold').text(`${pm.score}`, 50, y + 8, { width: 150, align: 'center' });
  doc.fillColor(COLORS.white).fontSize(12).font('Helvetica').text('Score Paid Media', 50, y + 58, { width: 150, align: 'center' });

  y += 100;

  pm.checks.forEach((check) => {
    const statusColor = check.status === 'pass' ? COLORS.success : check.status === 'fail' ? COLORS.danger : COLORS.warning;
    const statusIcon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '!';
    const [sr, sg, sb] = hexToRGB(statusColor);

    doc.rect(50, y, pageWidth, 50).fill(COLORS.lightGray);
    doc.rect(50, y, 5, 50).fill(`rgb(${sr},${sg},${sb})`);

    const catCol = check.category === 'Meta Ads' ? '#1877F2' : check.category === 'Google Ads' ? '#4285F4' : COLORS.primary;
    doc.fillColor(catCol).fontSize(8).font('Helvetica-Bold').text(check.category.toUpperCase(), 65, y + 6, { width: 80 });
    doc.fillColor(COLORS.text).fontSize(10).font('Helvetica-Bold').text(check.title, 65, y + 18, { width: 280 });
    doc.fillColor(`rgb(${sr},${sg},${sb})`).fontSize(10).font('Helvetica-Bold').text(statusIcon + ' ' + (check.status === 'pass' ? 'OK' : check.status === 'fail' ? 'Falta' : 'Mejorar'), 365, y + 18, { width: 100 });

    if (check.status !== 'pass') {
      doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica').text(check.recommendation.substring(0, 130), 65, y + 36, { width: pageWidth - 30 });
    }

    y += 58;
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 60;
    }
  });
}

// ─── Plan de Acción ───────────────────────────────────────────────────────────
function drawActionPlan(doc, data, pageWidth, agencyColor) {
  drawPageHeader(doc, 'Plan de Acción Priorizado', agencyColor, pageWidth);
  let y = 130;

  const prioridades = data.ai?.prioridades || [];

  if (prioridades.length === 0) {
    doc.fillColor(COLORS.textLight).text('No se generó plan de acción automático.', 50, y);
    return;
  }

  prioridades.forEach((p, i) => {
    const impactColor = p.impacto === 'alto' ? COLORS.danger : p.impacto === 'medio' ? COLORS.warning : COLORS.success;
    const [ir, ig, ib] = hexToRGB(impactColor);
    const efuerzoColor = p.esfuerzo === 'alto' ? COLORS.danger : p.esfuerzo === 'medio' ? COLORS.warning : COLORS.success;
    const [er, eg, eb] = hexToRGB(efuerzoColor);

    doc.rect(50, y, pageWidth, 90).fill(COLORS.lightGray);

    // Número
    doc.rect(50, y, 40, 90).fill(`rgb(${ir},${ig},${ib})`);
    doc.fillColor(COLORS.white).fontSize(28).font('Helvetica-Bold').text(`${i + 1}`, 50, y + 28, { width: 40, align: 'center' });

    // Título
    doc.fillColor(COLORS.text).fontSize(12).font('Helvetica-Bold').text(p.titulo, 102, y + 8, { width: pageWidth - 60 });

    // Badges impacto / esfuerzo
    doc.rect(102, y + 28, 60, 14).fill(`rgb(${ir},${ig},${ib})`);
    doc.fillColor(COLORS.white).fontSize(8).font('Helvetica-Bold').text(`Impacto: ${p.impacto}`, 102, y + 31, { width: 60, align: 'center' });

    doc.rect(170, y + 28, 65, 14).fill(`rgb(${er},${eg},${eb})`);
    doc.fillColor(COLORS.white).fontSize(8).font('Helvetica-Bold').text(`Esfuerzo: ${p.esfuerzo}`, 170, y + 31, { width: 65, align: 'center' });

    doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text(p.descripcion, 102, y + 50, { width: pageWidth - 60 });

    if (p.impacto_estimado) {
      doc.fillColor(COLORS.info).fontSize(9).font('Helvetica-Bold').text(`→ ${p.impacto_estimado}`, 102, y + 73, { width: pageWidth - 60 });
    }

    y += 100;

    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 60;
    }
  });

  // Contacto agencia
  y = Math.max(y, doc.page.height - 200);
  const [ar, ag, ab] = hexToRGB(agencyColor);
  doc.rect(50, y, pageWidth, 80).fill(`rgb(${ar},${ag},${ab})`);
  doc.fillColor(COLORS.white).fontSize(14).font('Helvetica-Bold').text('¿Listo para implementar estas mejoras?', 65, y + 15, { width: pageWidth - 30 });
  doc.fillColor(COLORS.accent).fontSize(12).font('Helvetica').text(process.env.AGENCY_NAME || 'LaFête América', 65, y + 38);
  doc.fillColor(COLORS.white).fontSize(11).font('Helvetica').text(process.env.AGENCY_WEBSITE || 'lafeteamerica.com', 65, y + 55);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function drawPageHeader(doc, title, color, pageWidth) {
  const [r, g, b] = hexToRGB(color || COLORS.primary);
  doc.rect(50, 40, pageWidth, 60).fill(`rgb(${r},${g},${b})`);
  doc.fillColor(COLORS.white).fontSize(20).font('Helvetica-Bold').text(title, 65, 60, { width: pageWidth - 30 });

  const agencyName = process.env.AGENCY_NAME || 'LaFête América';
  doc.fillColor('rgba(255,255,255,0.6)').fontSize(9).font('Helvetica').text(agencyName, 65, 85, { width: pageWidth - 30, align: 'right' });
}

function drawFooter(doc, agencyName, pageNum, totalPages) {
  const y = doc.page.height - 40;
  doc.moveTo(50, y - 10).lineTo(doc.page.width - 50, y - 10).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica').text(`${agencyName} — ShopScan Pro`, 50, y, { width: 300 });
  doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica').text(`Página ${pageNum} de ${totalPages}`, 50, y, { width: doc.page.width - 100, align: 'right' });
}

module.exports = { generatePDFReport };
