const router = require('express').Router();
const { buildOntology } = require('../services/ontologyBuilder');

// GET /api/ontology?product_id=global
router.get('/', async (req, res) => {
  const productId = req.query.product_id || 'global';
  try {
    const result = await buildOntology(productId);
    res.json(result);
  } catch (err) {
    console.error('[Ontology] Build error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
