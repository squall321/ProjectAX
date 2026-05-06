const router = require('express').Router();
const db = require('../db');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  const { product_id, name } = req.body;
  if (!product_id || !name) return res.status(400).json({ error: 'product_id, name 필수' });
  try {
    await db.query(
      'INSERT INTO products (product_id, name) VALUES ($1, $2) ON CONFLICT (product_id) DO UPDATE SET name = EXCLUDED.name',
      [product_id, name]
    );
    res.json({ status: 'ok', product_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
