const router = require('express').Router();
const db = require('../db');

/**
 * GET /api/system/export
 * 전사 온톨로지 데이터를 하나의 JSON으로 패키징하여 내보냅니다.
 */
router.get('/export', async (req, res) => {
  try {
    const { rows: products } = await db.query('SELECT * FROM products');
    const { rows: registry } = await db.query('SELECT * FROM schema_registry');
    const { rows: nodes } = await db.query('SELECT * FROM nodes');

    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      products,
      registry,
      nodes
    };

    res.json(backupData);
  } catch (err) {
    console.error('[System] Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/system/import
 * 외부 JSON 데이터를 가져와 DB에 복원합니다. (기존 데이터 유지/병합)
 */
router.post('/import', async (req, res) => {
  const { products, registry, nodes } = req.body;

  if (!products || !registry || !nodes) {
    return res.status(400).json({ error: '유효한 백업 데이터 형식이 아닙니다.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Products 복원 (ON CONFLICT IGNORE/UPDATE)
    for (const p of products) {
      await client.query(
        `INSERT INTO products (product_id, name, status) VALUES ($1, $2, $3)
         ON CONFLICT (product_id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status`,
        [p.product_id, p.name, p.status]
      );
    }

    // 2. Registry 복원
    for (const r of registry) {
      await client.query(
        `INSERT INTO schema_registry (format_id, name, data_class, file_types, embedded_schema, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (format_id) DO UPDATE SET 
           name = EXCLUDED.name, data_class = EXCLUDED.data_class, 
           embedded_schema = EXCLUDED.embedded_schema, description = EXCLUDED.description`,
        [r.format_id, r.name, r.data_class, r.file_types, r.embedded_schema, r.description]
      );
    }

    // 3. Nodes 복원
    for (const n of nodes) {
      await client.query(
        `INSERT INTO nodes (node_id, product_id, meta, inputs, processes, outputs, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (node_id, product_id) DO UPDATE SET
           meta = EXCLUDED.meta, inputs = EXCLUDED.inputs, 
           processes = EXCLUDED.processes, outputs = EXCLUDED.outputs,
           version = EXCLUDED.version`,
        [n.node_id, n.product_id, n.meta, n.inputs, n.processes, n.outputs, n.version]
      );
    }

    await client.query('COMMIT');
    res.json({ status: 'ok', message: `복구 완료: Products(${products.length}), Formats(${registry.length}), Nodes(${nodes.length})` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[System] Import error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
