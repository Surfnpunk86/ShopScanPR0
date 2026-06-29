const axios = require('axios');

// ─── Auditoría CRO via análisis HTML ─────────────────────────────────────────
async function getCROAudit(url) {
  try {
    const cheerio = require('cheerio');
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShopScanBot/1.0)' },
    });

    const $ = cheerio.load(html);
    const checks = [];

    // ── 1. CTA Principal ─────────────────────────────────────────────────────
    const addToCartBtns = $('[class*="add-to-cart"], [id*="add-to-cart"], [name*="add"], button:contains("Agregar"), button:contains("Añadir"), button:contains("Comprar"), button:contains("Add to cart")');
    checks.push({
      category: 'CTA',
      id: 'cta_atc',
      title: 'Botón "Agregar al carrito" visible',
      status: addToCartBtns.length > 0 ? 'pass' : 'fail',
      impact: 'alto',
      recommendation: addToCartBtns.length === 0
        ? 'No se detectó botón de añadir al carrito. Verifica que sea visible above the fold y con color contrastante.'
        : 'Botón ATC detectado. Verifica que esté visible sin hacer scroll en móvil.',
    });

    // ── 2. Testimonios / Reviews ──────────────────────────────────────────────
    const reviews = $('[class*="review"], [class*="testimonial"], [class*="rating"], [id*="review"], .star-rating, .product-reviews');
    checks.push({
      category: 'Confianza',
      id: 'social_proof',
      title: 'Reviews o testimonios presentes',
      status: reviews.length > 0 ? 'pass' : 'fail',
      impact: 'alto',
      recommendation: reviews.length === 0
        ? 'No se detectaron reviews visibles. Las tiendas con reviews convierten hasta 270% más. Implementa una app de reseñas (Judge.me, Loox, Okendo).'
        : 'Reviews detectados. Verifica que muestren calificación promedio y cantidad de reseñas.',
    });

    // ── 3. Urgencia / Escasez ─────────────────────────────────────────────────
    const urgency = $('[class*="countdown"], [class*="urgency"], [class*="scarcity"], [class*="stock"], :contains("últimas unidades"), :contains("quedan"), :contains("oferta termina")');
    checks.push({
      category: 'Conversión',
      id: 'urgency',
      title: 'Elementos de urgencia o escasez',
      status: urgency.length > 0 ? 'pass' : 'warn',
      impact: 'medio',
      recommendation: urgency.length === 0
        ? 'No se detectaron elementos de urgencia. Un contador de tiempo o indicador de stock bajo puede aumentar conversiones 20-30%.'
        : 'Elementos de urgencia detectados.',
    });

    // ── 4. Métodos de pago visibles ───────────────────────────────────────────
    const paymentIcons = $('[class*="payment"], [class*="pago"], img[src*="visa"], img[src*="mastercard"], img[src*="paypal"], img[src*="mercadopago"], img[alt*="pago"]');
    checks.push({
      category: 'Confianza',
      id: 'payment_icons',
      title: 'Iconos de métodos de pago visibles',
      status: paymentIcons.length > 0 ? 'pass' : 'warn',
      impact: 'medio',
      recommendation: paymentIcons.length === 0
        ? 'No se detectaron logos de métodos de pago. Mostrar Visa, Mastercard, PayU, MercadoPago reduce la fricción en checkout.'
        : 'Métodos de pago detectados. Asegúrate de incluir los más populares en tu mercado.',
    });

    // ── 5. Chat / Soporte en vivo ─────────────────────────────────────────────
    const liveChat = $('[class*="chat"], [id*="chat"], [class*="intercom"], [class*="zendesk"], [class*="tidio"], [class*="crisp"], [class*="whatsapp"]');
    checks.push({
      category: 'Soporte',
      id: 'live_chat',
      title: 'Chat o soporte en vivo',
      status: liveChat.length > 0 ? 'pass' : 'warn',
      impact: 'medio',
      recommendation: liveChat.length === 0
        ? 'No se detectó chat en vivo. Implementar WhatsApp Business o Tidio puede aumentar conversiones 10-15%.'
        : 'Canal de soporte detectado. Verifica que responda en menos de 5 minutos en horario comercial.',
    });

    // ── 6. Popup / Captura de leads ───────────────────────────────────────────
    const popup = $('[class*="popup"], [class*="modal"], [class*="newsletter"], [class*="suscri"]');
    checks.push({
      category: 'Captación',
      id: 'lead_capture',
      title: 'Popup de captura de leads o descuento',
      status: popup.length > 0 ? 'pass' : 'warn',
      impact: 'medio',
      recommendation: popup.length === 0
        ? 'No se detectó popup de captura. Un popup con 10% de descuento al suscribirse puede capturar 5-8% de visitantes para remarketing.'
        : 'Popup de captura detectado. Asegúrate de que ofrezca un incentivo claro.',
    });

    // ── 7. Imágenes de producto ───────────────────────────────────────────────
    const productImages = $('[class*="product-image"], [class*="product-photo"], [class*="product-gallery"], .product__media');
    checks.push({
      category: 'Producto',
      id: 'product_images',
      title: 'Galería de imágenes de producto',
      status: productImages.length > 0 ? 'pass' : 'warn',
      impact: 'alto',
      recommendation: productImages.length === 0
        ? 'No se detectó galería de producto en homepage. Las páginas de producto deben tener mínimo 4-6 imágenes de alta calidad.'
        : 'Galería detectada. Asegúrate de incluir fotos en contexto de uso y posibilidad de zoom.',
    });

    // ── 8. Breadcrumbs ────────────────────────────────────────────────────────
    const breadcrumbs = $('[class*="breadcrumb"], [aria-label*="breadcrumb"], nav[aria-label*="ruta"]');
    checks.push({
      category: 'Navegación',
      id: 'breadcrumbs',
      title: 'Breadcrumbs de navegación',
      status: breadcrumbs.length > 0 ? 'pass' : 'warn',
      impact: 'bajo',
      recommendation: breadcrumbs.length === 0
        ? 'No se detectaron breadcrumbs. Mejoran la navegación y el SEO de páginas de categoría y producto.'
        : 'Breadcrumbs detectados correctamente.',
    });

    // ── 9. Buscador interno ───────────────────────────────────────────────────
    const searchBar = $('input[type="search"], input[name="q"], input[placeholder*="busca"], input[placeholder*="search"], [class*="search-input"]');
    checks.push({
      category: 'Navegación',
      id: 'search',
      title: 'Buscador interno visible',
      status: searchBar.length > 0 ? 'pass' : 'fail',
      impact: 'alto',
      recommendation: searchBar.length === 0
        ? 'No se detectó buscador. Los usuarios que usan búsqueda interna convierten 5x más. Es prioridad implementarlo en header.'
        : 'Buscador detectado. Considera agregar autocompletar y búsqueda visual.',
    });

    // ── 10. Footer completo ───────────────────────────────────────────────────
    const footer = $('footer');
    const hasPrivacy = $('a:contains("Privacidad"), a:contains("Privacy")').length > 0;
    const hasTerms = $('a:contains("Términos"), a:contains("Terms")').length > 0;
    checks.push({
      category: 'Legal',
      id: 'footer_legal',
      title: 'Políticas legales en footer',
      status: hasPrivacy && hasTerms ? 'pass' : 'fail',
      impact: 'medio',
      recommendation: !hasPrivacy || !hasTerms
        ? 'Faltan políticas de privacidad o términos. Son obligatorias para cumplir regulaciones LATAM y aumentan confianza del comprador.'
        : 'Políticas legales detectadas.',
    });

    // ── Calcular score CRO ────────────────────────────────────────────────────
    const passed = checks.filter((c) => c.status === 'pass').length;
    const score = Math.round((passed / checks.length) * 100);

    return {
      score,
      totalChecks: checks.length,
      passed,
      failed: checks.filter((c) => c.status === 'fail').length,
      warnings: checks.filter((c) => c.status === 'warn').length,
      checks,
      grade: getGrade(score),
    };
  } catch (err) {
    console.error('CRO audit error:', err.message);
    return { error: true, message: 'No se pudo completar el análisis CRO', score: 0, checks: [] };
  }
}

// ─── Análisis de Paid Media (Meta Ads + Google) ───────────────────────────────
async function getPaidMediaAudit(url) {
  try {
    const cheerio = require('cheerio');
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShopScanBot/1.0)' },
    });

    const $ = cheerio.load(html);
    const bodyHtml = $.html();
    const checks = [];

    // ── Meta Pixel ────────────────────────────────────────────────────────────
    const hasMetaPixel =
      bodyHtml.includes('connect.facebook.net') ||
      bodyHtml.includes('fbq(') ||
      bodyHtml.includes('_fbq') ||
      bodyHtml.includes('facebook-pixel');

    checks.push({
      category: 'Meta Ads',
      id: 'meta_pixel',
      title: 'Meta Pixel instalado',
      status: hasMetaPixel ? 'pass' : 'fail',
      impact: 'crítico',
      recommendation: !hasMetaPixel
        ? 'NO SE DETECTÓ Meta Pixel. Sin pixel no puedes hacer retargeting ni optimizar campañas. Instala vía Business Manager o app de Shopify.'
        : 'Meta Pixel detectado. Verifica en Meta Pixel Helper que dispare eventos correctamente.',
    });

    // ── Meta Conversions API (CAPI) ───────────────────────────────────────────
    // CAPI es server-side, no detectable via HTML, pero podemos verificar eventos avanzados
    const hasAddToCart = bodyHtml.includes("fbq('track', 'AddToCart")  || bodyHtml.includes('fbq("track","AddToCart');
    const hasPurchase = bodyHtml.includes("fbq('track', 'Purchase'") || bodyHtml.includes('fbq("track","Purchase"');
    const hasViewContent = bodyHtml.includes("fbq('track', 'ViewContent'") || bodyHtml.includes('fbq("track","ViewContent"');

    checks.push({
      category: 'Meta Ads',
      id: 'meta_events',
      title: 'Eventos de Meta configurados (ATC, Purchase, ViewContent)',
      status: hasAddToCart && hasPurchase ? 'pass' : hasAddToCart || hasPurchase ? 'warn' : 'fail',
      impact: 'alto',
      recommendation: !hasAddToCart && !hasPurchase
        ? 'No se detectaron eventos estándar de Meta. Configura: ViewContent, AddToCart, InitiateCheckout y Purchase para optimización de campañas.'
        : !hasPurchase
        ? 'Falta el evento Purchase. Es el más importante para optimización de conversiones en Meta.'
        : 'Eventos de Meta configurados. Considera implementar Conversions API para mejorar la atribución post-iOS 14.',
      details: { hasAddToCart, hasPurchase, hasViewContent },
    });

    // ── Google Analytics / GA4 ────────────────────────────────────────────────
    const hasGA4 = bodyHtml.includes('gtag(') && (bodyHtml.includes("'G-") || bodyHtml.includes('"G-'));
    const hasUAGA = bodyHtml.includes('ga(') && (bodyHtml.includes("'UA-") || bodyHtml.includes('"UA-'));
    const hasGTM = bodyHtml.includes('googletagmanager.com/gtm.js') || bodyHtml.includes('GTM-');

    checks.push({
      category: 'Google Ads',
      id: 'ga4',
      title: 'Google Analytics 4 instalado',
      status: hasGA4 ? 'pass' : hasUAGA ? 'warn' : 'fail',
      impact: 'alto',
      recommendation: !hasGA4 && !hasUAGA
        ? 'No se detectó Google Analytics. Sin datos no puedes optimizar ningún canal.'
        : !hasGA4 && hasUAGA
        ? 'Tienes Universal Analytics (obsoleto desde julio 2023). Migra a GA4 urgentemente.'
        : 'GA4 detectado correctamente.',
    });

    // ── Google Tag Manager ────────────────────────────────────────────────────
    checks.push({
      category: 'Tracking',
      id: 'gtm',
      title: 'Google Tag Manager instalado',
      status: hasGTM ? 'pass' : 'warn',
      impact: 'medio',
      recommendation: !hasGTM
        ? 'No se detectó GTM. Implementarlo permite gestionar todos los píxeles y tags sin tocar código.'
        : 'GTM detectado. Asegúrate de tener las conversiones de Google Ads configuradas.',
    });

    // ── Google Ads Pixel ──────────────────────────────────────────────────────
    const hasGoogleAds =
      bodyHtml.includes('googleadservices.com') ||
      bodyHtml.includes('gtag_report_conversion') ||
      bodyHtml.includes('AW-');

    checks.push({
      category: 'Google Ads',
      id: 'google_ads_pixel',
      title: 'Conversiones de Google Ads configuradas',
      status: hasGoogleAds ? 'pass' : 'warn',
      impact: 'alto',
      recommendation: !hasGoogleAds
        ? 'No se detectaron conversiones de Google Ads. Configura al menos la conversión de compra para optimizar campañas de Shopping y Search.'
        : 'Pixel de Google Ads detectado. Verifica que dispare en la página de confirmación de compra.',
    });

    // ── Schema / Rich Snippets ────────────────────────────────────────────────
    const schemaScripts = $('script[type="application/ld+json"]');
    let hasProductSchema = false;
    schemaScripts.each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json['@type'] === 'Product' || (Array.isArray(json) && json.some((j) => j['@type'] === 'Product'))) {
          hasProductSchema = true;
        }
      } catch (e) {}
    });

    checks.push({
      category: 'SEO Pagado',
      id: 'product_schema',
      title: 'Schema de Producto (Rich Snippets)',
      status: hasProductSchema ? 'pass' : 'warn',
      impact: 'medio',
      recommendation: !hasProductSchema
        ? 'No se detectó Schema de Producto. Los rich snippets en Google muestran precio y rating en resultados y mejoran CTR 20-30%.'
        : 'Schema de Producto detectado. Verifica en Google Rich Results Test.',
    });

    // ── TikTok Pixel ──────────────────────────────────────────────────────────
    const hasTikTokPixel = bodyHtml.includes('analytics.tiktok.com') || bodyHtml.includes('ttq.');
    checks.push({
      category: 'Social Ads',
      id: 'tiktok_pixel',
      title: 'TikTok Pixel instalado',
      status: hasTikTokPixel ? 'pass' : 'warn',
      impact: 'medio',
      recommendation: !hasTikTokPixel
        ? 'No se detectó TikTok Pixel. TikTok Ads tiene CPMs muy bajos en LATAM (2025). Vale la pena instalar el pixel ahora para construir audiencias.'
        : 'TikTok Pixel detectado.',
    });

    const passed = checks.filter((c) => c.status === 'pass').length;
    const score = Math.round((passed / checks.length) * 100);

    return {
      score,
      totalChecks: checks.length,
      passed,
      failed: checks.filter((c) => c.status === 'fail').length,
      warnings: checks.filter((c) => c.status === 'warn').length,
      checks,
      grade: getGrade(score),
    };
  } catch (err) {
    console.error('Paid media audit error:', err.message);
    return { error: true, message: 'No se pudo completar el análisis de Paid Media', score: 0, checks: [] };
  }
}

function getGrade(score) {
  if (score >= 90) return { letter: 'A', label: 'Excelente', color: '#10b981' };
  if (score >= 75) return { letter: 'B', label: 'Bueno', color: '#3b82f6' };
  if (score >= 60) return { letter: 'C', label: 'Regular', color: '#f59e0b' };
  if (score >= 40) return { letter: 'D', label: 'Deficiente', color: '#f97316' };
  return { letter: 'F', label: 'Crítico', color: '#ef4444' };
}

module.exports = { getCROAudit, getPaidMediaAudit };
