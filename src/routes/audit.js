const express = require('express');
const router = express.Router();
const { getPageSpeedData, getSEOData, detectPlatform } = require('../services/techAudit');
const { getCROAudit, getPaidMediaAudit } = require('../services/croAudit');
const { getAIAnalysis } = require('../services/aiAnalysis');

// ─── POST /api/audit/run ──────────────────────────────────────────────────────
router.post('/run', async (req, res) => {
  let { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  // Normalizar URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    new URL(url); // validar formato
  } catch (e) {
    return res.status(400).json({ error: 'URL inválida' });
  }

  console.log(`[Audit] Iniciando análisis de: ${url}`);

  // Respuesta con Server-Sent Events para progreso en tiempo real
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendProgress = (step, message, data = null) => {
    res.write(`data: ${JSON.stringify({ step, message, data })}\n\n`);
  };

  try {
    sendProgress('start', 'Iniciando diagnóstico...', { url });

    // 1. Detectar plataforma
    sendProgress('platform', 'Detectando plataforma de ecommerce...');
    const platform = await detectPlatform(url);
    sendProgress('platform', 'Plataforma detectada', { platform });

    // 2. PageSpeed Mobile
    sendProgress('mobile', 'Analizando velocidad en móvil...');
    const mobileData = await getPageSpeedData(url, 'mobile');
    sendProgress('mobile', 'Análisis móvil completado', { score: mobileData.scores?.performance });

    // 3. PageSpeed Desktop
    sendProgress('desktop', 'Analizando velocidad en desktop...');
    const desktopData = await getPageSpeedData(url, 'desktop');
    sendProgress('desktop', 'Análisis desktop completado', { score: desktopData.scores?.performance });

    // 4. SEO
    sendProgress('seo', 'Analizando factores SEO...');
    const seoData = await getSEOData(url);
    sendProgress('seo', 'Análisis SEO completado');

    // 5. CRO
    sendProgress('cro', 'Auditando elementos de conversión...');
    const croData = await getCROAudit(url);
    sendProgress('cro', 'Auditoría CRO completada', { score: croData.score });

    // 6. Paid Media
    sendProgress('paidmedia', 'Verificando pixels y tracking...');
    const paidMediaData = await getPaidMediaAudit(url);
    sendProgress('paidmedia', 'Análisis de Paid Media completado', { score: paidMediaData.score });

    // 7. IA Analysis
    sendProgress('ai', 'Generando análisis con inteligencia artificial...');
    const fullData = {
      url,
      platform,
      mobile: mobileData,
      desktop: desktopData,
      seo: seoData,
      cro: croData,
      paidMedia: paidMediaData,
    };
    const aiData = await getAIAnalysis(fullData);
    fullData.ai = aiData;

    sendProgress('complete', 'Diagnóstico completado', fullData);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[Audit] Error:', err.message);
    sendProgress('error', 'Error durante el diagnóstico: ' + err.message);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ─── POST /api/audit/quick ────────────────────────────────────────────────────
// Versión síncrona para testing
router.post('/quick', async (req, res) => {
  let { url } = req.body;

  if (!url) return res.status(400).json({ error: 'URL requerida' });
  if (!url.startsWith('http')) url = 'https://' + url;

  try {
    const [platform, mobile, seo, cro, paidMedia] = await Promise.all([
      detectPlatform(url),
      getPageSpeedData(url, 'mobile'),
      getSEOData(url),
      getCROAudit(url),
      getPaidMediaAudit(url),
    ]);

    const result = { url, platform, mobile, seo, cro, paidMedia, timestamp: new Date().toISOString() };
    result.ai = await getAIAnalysis(result);

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
