const express = require('express');
const router = express.Router();
const { generatePDFReport } = require('../services/pdfReport');

// POST /api/report/pdf — recibe los datos del audit y genera el PDF
router.post('/pdf', (req, res) => {
  const { auditData } = req.body;

  if (!auditData) {
    return res.status(400).json({ error: 'Datos de auditoría requeridos' });
  }

  try {
    generatePDFReport(auditData, res);
  } catch (err) {
    console.error('[Report] Error generando PDF:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generando el reporte PDF' });
    }
  }
});

module.exports = router;
