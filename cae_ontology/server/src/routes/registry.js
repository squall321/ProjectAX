const router = require('express').Router();
const db = require('../db');

// GET /api/registry — 전체 포맷 사전 조회
router.get('/', async (req, res) => {
  try {
    const { rows: formats } = await db.query(
      'SELECT * FROM schema_registry ORDER BY format_id'
    );
    res.json({ formats });
  } catch (err) {
    console.error('[Registry] GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registry — 포맷 신규 등록
router.post('/', async (req, res) => {
  const { format_id, name, data_class, file_types, embedded_schema, description } = req.body;
  if (!format_id || !name || !data_class) {
    return res.status(400).json({ error: 'format_id, name, data_class 필수' });
  }
  try {
    await db.query(
      `INSERT INTO schema_registry (format_id, name, data_class, file_types, embedded_schema, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (format_id) DO UPDATE SET
         name = EXCLUDED.name, data_class = EXCLUDED.data_class,
         file_types = EXCLUDED.file_types, embedded_schema = EXCLUDED.embedded_schema,
         description = EXCLUDED.description, updated_at = NOW()`,
      [format_id, name, data_class, file_types || null, embedded_schema || null, description || null]
    );
    res.json({ status: 'ok', format_id });
  } catch (err) {
    console.error('[Registry] POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
