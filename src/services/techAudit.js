const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hora de caché

const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// ─── PageSpeed / Core Web Vitals ─────────────────────────────────────────────
async function getPageSpeedData(url, strategy = 'mobile') {
  const cacheKey = `psi_${strategy}_${url}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = {
    url,
    strategy,
    category: ['performance', 'seo', 'best-practices', 'accessibility'],
  };

  if (process.env.PAGESPEED_API_KEY) {
    params.key = process.env.PAGESPEED_API_KEY;
  }

  try {
    const { data } = await axios.get(PAGESPEED_API, { params, timeout: 30000 });
    const result = parsePageSpeedResponse(data, strategy);
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`PageSpeed error (${strategy}):`, err.message);
    return getDefaultPageSpeedResult(strategy);
  }
}

function parsePageSpeedResponse(data, strategy) {
  const cats = data.lighthouseResult?.categories || {};
  const audits = data.lighthouseResult?.audits || {};
  const cwv = data.loadingExperience?.metrics || {};

  const score = (cat) => Math.round((cats[cat]?.score || 0) * 100);

  // Core Web Vitals
  const lcp = cwv.LARGEST_CONTENTFUL_PAINT_MS;
  const fid = cwv.FIRST_INPUT_DELAY_MS;
  const cls = cwv.CUMULATIVE_LAYOUT_SHIFT_SCORE;
  const fcp = cwv.FIRST_CONTENTFUL_PAINT_MS;
  const ttfb = cwv.EXPERIMENTAL_TIME_TO_FIRST_BYTE;

  return {
    strategy,
    scores: {
      performance: score('performance'),
      seo: score('seo'),
      bestPractices: score('best-practices'),
      accessibility: score('accessibility'),
    },
    coreWebVitals: {
      lcp: {
        value: lcp?.percentile || audits['largest-contentful-paint']?.displayValue || 'N/A',
        category: lcp?.category || 'NEEDS_IMPROVEMENT',
        label: 'Largest Contentful Paint',
      },
      fid: {
        value: fid?.percentile || audits['max-potential-fid']?.displayValue || 'N/A',
        category: fid?.category || 'NEEDS_IMPROVEMENT',
        label: 'First Input Delay',
      },
      cls: {
        value: cls?.percentile || audits['cumulative-layout-shift']?.displayValue || 'N/A',
        category: cls?.category || 'NEEDS_IMPROVEMENT',
        label: 'Cumulative Layout Shift',
      },
      fcp: {
        value: fcp?.percentile || audits['first-contentful-paint']?.displayValue || 'N/A',
        category: fcp?.category || 'GOOD',
        label: 'First Contentful Paint',
      },
      ttfb: {
        value: ttfb?.percentile || audits['server-response-time']?.displayValue || 'N/A',
        category: ttfb?.category || 'NEEDS_IMPROVEMENT',
        label: 'Time to First Byte',
      },
    },
    opportunities: extractOpportunities(audits),
    diagnostics: extractDiagnostics(audits),
  };
}

function extractOpportunities(audits) {
  const keys = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'uses-optimized-images',
    'uses-webp-images',
    'uses-text-compression',
    'uses-responsive-images',
    'efficient-animated-content',
    'total-byte-weight',
  ];

  return keys
    .map((key) => {
      const audit = audits[key];
      if (!audit || audit.score === 1) return null;
      return {
        id: key,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue || '',
        impact: getImpactLabel(audit.score),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
}

function extractDiagnostics(audits) {
  const keys = [
    'uses-long-cache-ttl',
    'dom-size',
    'critical-request-chains',
    'mainthread-work-breakdown',
    'bootup-time',
    'uses-passive-event-listeners',
    'no-document-write',
    'third-party-summary',
  ];

  return keys
    .map((key) => {
      const audit = audits[key];
      if (!audit) return null;
      return {
        id: key,
        title: audit.title,
        score: audit.score,
        displayValue: audit.displayValue || '',
        impact: getImpactLabel(audit.score),
      };
    })
    .filter(Boolean);
}

function getImpactLabel(score) {
  if (score === null) return 'informativo';
  if (score >= 0.9) return 'bajo';
  if (score >= 0.5) return 'medio';
  return 'alto';
}

function getDefaultPageSpeedResult(strategy) {
  return {
    strategy,
    scores: { performance: 0, seo: 0, bestPractices: 0, accessibility: 0 },
    coreWebVitals: {},
    opportunities: [],
    diagnostics: [],
    error: true,
  };
}

// ─── Análisis SEO básico via HTML scraping ───────────────────────────────────
async function getSEOData(url) {
  const cacheKey = `seo_${url}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const cheerio = require('cheerio');
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShopScanBot/1.0; +https://shopscan.pro)',
      },
    });

    const $ = cheerio.load(html);

    const result = {
      title: {
        value: $('title').first().text().trim(),
        length: $('title').first().text().trim().length,
        status: getTitleStatus($('title').first().text().trim()),
      },
      metaDescription: {
        value: $('meta[name="description"]').attr('content') || '',
        length: ($('meta[name="description"]').attr('content') || '').length,
        status: getMetaDescStatus($('meta[name="description"]').attr('content') || ''),
      },
      h1: {
        count: $('h1').length,
        values: $('h1').map((_, el) => $(el).text().trim()).get().slice(0, 3),
        status: $('h1').length === 1 ? 'bueno' : $('h1').length === 0 ? 'faltante' : 'múltiples',
      },
      images: {
        total: $('img').length,
        withoutAlt: $('img:not([alt])').length + $('img[alt=""]').length,
        status: $('img:not([alt])').length === 0 ? 'bueno' : 'mejorable',
      },
      canonicalUrl: $('link[rel="canonical"]').attr('href') || null,
      ogTags: {
        title: $('meta[property="og:title"]').attr('content') || null,
        description: $('meta[property="og:description"]').attr('content') || null,
        image: $('meta[property="og:image"]').attr('content') || null,
      },
      structuredData: $('script[type="application/ld+json"]').length > 0,
      robotsMeta: $('meta[name="robots"]').attr('content') || null,
      hreflang: $('link[rel="hreflang"]').length,
      internalLinks: $('a[href^="/"], a[href^="' + url + '"]').length,
      externalLinks: $('a[href^="http"]').not('[href^="' + url + '"]').length,
    };

    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('SEO scraping error:', err.message);
    return { error: true, message: 'No se pudo analizar el HTML de la página' };
  }
}

function getTitleStatus(title) {
  if (!title) return 'faltante';
  if (title.length < 30) return 'corto';
  if (title.length > 60) return 'largo';
  return 'bueno';
}

function getMetaDescStatus(desc) {
  if (!desc) return 'faltante';
  if (desc.length < 120) return 'corto';
  if (desc.length > 160) return 'largo';
  return 'bueno';
}

// ─── Detección de plataforma ──────────────────────────────────────────────────
async function detectPlatform(url) {
  try {
    const { data: html, headers } = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShopScanBot/1.0)' },
    });

    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const bodyHtml = $.html().toLowerCase();

    if (
      bodyHtml.includes('cdn.shopify.com') ||
      bodyHtml.includes('myshopify.com') ||
      $('meta[name="shopify-checkout-api-token"]').length > 0
    ) {
      return { platform: 'Shopify', confidence: 'alta', icon: '🛍️' };
    }
    if (bodyHtml.includes('woocommerce') || bodyHtml.includes('wp-content/plugins/woocommerce')) {
      return { platform: 'WooCommerce', confidence: 'alta', icon: '🛒' };
    }
    if (bodyHtml.includes('vtex') || headers['x-vtex-processada']) {
      return { platform: 'VTEX', confidence: 'alta', icon: '🔷' };
    }
    if (bodyHtml.includes('bigcommerce') || headers['x-bc-canonical']) {
      return { platform: 'BigCommerce', confidence: 'alta', icon: '🏪' };
    }
    if (bodyHtml.includes('tiendanube') || bodyHtml.includes('nuvemshop')) {
      return { platform: 'Tienda Nube', confidence: 'alta', icon: '☁️' };
    }
    if (bodyHtml.includes('magento') || bodyHtml.includes('mage-')) {
      return { platform: 'Magento', confidence: 'media', icon: '🟠' };
    }

    return { platform: 'Desconocida / Personalizada', confidence: 'baja', icon: '❓' };
  } catch (err) {
    return { platform: 'No detectada', confidence: 'ninguna', icon: '⚠️' };
  }
}

module.exports = { getPageSpeedData, getSEOData, detectPlatform };
