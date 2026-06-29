const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    name: 'ShopScan Pro',
    agency: process.env.AGENCY_NAME || 'LaFête América',
    timestamp: new Date().toISOString(),
    services: {
      pagespeed: !!process.env.PAGESPEED_API_KEY,
      ai: !!process.env.ANTHROPIC_API_KEY,
    },
  });
});

router.get('/config', (req, res) => {
  res.json({
    agency: {
      name: process.env.AGENCY_NAME || 'LaFête América',
      color: process.env.AGENCY_COLOR || '#1a1a2e',
      website: process.env.AGENCY_WEBSITE || '',
    },
  });
});

module.exports = router;
