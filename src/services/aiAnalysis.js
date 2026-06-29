const axios = require('axios');

// ─── Análisis IA con Claude ───────────────────────────────────────────────────
async function getAIAnalysis(auditData) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return getDefaultAnalysis(auditData);
  }

  try {
    const prompt = buildAnalysisPrompt(auditData);

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      }
    );

    const text = response.data.content[0].text;
    return parseAIResponse(text);
  } catch (err) {
    console.error('Claude API error:', err.message);
    return getDefaultAnalysis(auditData);
  }
}

function buildAnalysisPrompt(data) {
  return `Eres un experto en ecommerce y CRO para el mercado latinoamericano. Analiza los siguientes datos de diagnóstico de una tienda online y proporciona recomendaciones accionables.

DATOS DEL DIAGNÓSTICO:
- URL: ${data.url}
- Plataforma: ${data.platform?.platform || 'Desconocida'}
- Score Performance (Mobile): ${data.mobile?.scores?.performance || 'N/A'}/100
- Score Performance (Desktop): ${data.desktop?.scores?.performance || 'N/A'}/100
- Score SEO: ${data.mobile?.scores?.seo || 'N/A'}/100
- Score CRO: ${data.cro?.score || 'N/A'}/100
- Score Paid Media: ${data.paidMedia?.score || 'N/A'}/100

PROBLEMAS CRÍTICOS DETECTADOS:
${buildCriticalIssues(data)}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "resumen_ejecutivo": "2-3 oraciones resumiendo el estado general de la tienda",
  "puntuacion_general": número del 0 al 100,
  "nivel": "crítico|deficiente|regular|bueno|excelente",
  "prioridades": [
    {
      "titulo": "Acción específica",
      "impacto": "alto|medio|bajo",
      "esfuerzo": "alto|medio|bajo",
      "descripcion": "Descripción detallada de qué hacer y por qué",
      "impacto_estimado": "Descripción del resultado esperado"
    }
  ],
  "oportunidades_rapidas": ["Acción 1 que se puede hacer en menos de 1 hora", "Acción 2", "Acción 3"],
  "benchmark_latam": "Comparación del desempeño vs. tiendas similares en LATAM"
}

Máximo 5 prioridades. Sé específico y accionable. Enfócate en el mercado latinoamericano.`;
}

function buildCriticalIssues(data) {
  const issues = [];

  if (data.mobile?.scores?.performance < 50) {
    issues.push(`- Velocidad móvil CRÍTICA: ${data.mobile.scores.performance}/100`);
  }
  if (data.paidMedia?.checks) {
    const failedPaid = data.paidMedia.checks.filter((c) => c.status === 'fail');
    failedPaid.forEach((c) => issues.push(`- ${c.title}: FALLIDO`));
  }
  if (data.cro?.checks) {
    const failedCRO = data.cro.checks.filter((c) => c.status === 'fail' && c.impact === 'alto');
    failedCRO.forEach((c) => issues.push(`- CRO: ${c.title} no detectado`));
  }
  if (data.seo?.title?.status !== 'bueno') {
    issues.push(`- Meta title: ${data.seo?.title?.status || 'no evaluado'}`);
  }

  return issues.length > 0 ? issues.join('\n') : '- No se detectaron problemas críticos graves';
}

function parseAIResponse(text) {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    return getDefaultAnalysisText(text);
  }
}

function getDefaultAnalysis(data) {
  const avgScore = Math.round(
    ((data.mobile?.scores?.performance || 50) +
      (data.mobile?.scores?.seo || 50) +
      (data.cro?.score || 50) +
      (data.paidMedia?.score || 50)) / 4
  );

  return {
    resumen_ejecutivo: `La tienda presenta oportunidades de mejora en velocidad, SEO y configuración de tracking. Un diagnóstico más detallado requiere acceso al panel de la tienda.`,
    puntuacion_general: avgScore,
    nivel: avgScore >= 75 ? 'bueno' : avgScore >= 60 ? 'regular' : avgScore >= 40 ? 'deficiente' : 'crítico',
    prioridades: [
      {
        titulo: 'Optimizar velocidad de carga móvil',
        impacto: 'alto',
        esfuerzo: 'medio',
        descripcion: 'La velocidad en móvil es el factor #1 de conversión en LATAM donde 70%+ del tráfico es mobile.',
        impacto_estimado: 'Mejora de 15-25% en tasa de conversión móvil',
      },
      {
        titulo: 'Verificar y optimizar Meta Pixel',
        impacto: 'alto',
        esfuerzo: 'bajo',
        descripcion: 'Asegurar que todos los eventos de conversión estén correctamente configurados.',
        impacto_estimado: 'Mejor optimización de campañas y reducción de CPA',
      },
      {
        titulo: 'Implementar social proof',
        impacto: 'alto',
        esfuerzo: 'bajo',
        descripcion: 'Reviews y testimonios visibles en homepage y páginas de producto.',
        impacto_estimado: 'Aumento del 20-30% en confianza del comprador',
      },
    ],
    oportunidades_rapidas: [
      'Comprimir imágenes con TinyPNG o similar',
      'Verificar Meta Pixel con Meta Pixel Helper (extensión Chrome)',
      'Agregar WhatsApp flotante para soporte inmediato',
    ],
    benchmark_latam: 'Las tiendas de ecommerce en LATAM con mejor desempeño tienen scores de performance superiores a 70 en móvil y tasas de conversión entre 2-4%.',
  };
}

function getDefaultAnalysisText(text) {
  return {
    resumen_ejecutivo: text.substring(0, 300),
    puntuacion_general: 50,
    nivel: 'regular',
    prioridades: [],
    oportunidades_rapidas: [],
    benchmark_latam: '',
  };
}

module.exports = { getAIAnalysis };
