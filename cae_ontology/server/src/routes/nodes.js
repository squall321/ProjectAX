const router = require('express').Router();
const db = require('../db');

// GET /api/nodes?product_id=global
router.get('/', async (req, res) => {
  const productId = req.query.product_id || 'global';
  try {
    const { rows } = await db.query(
      'SELECT node_id, meta, version, updated_at FROM nodes WHERE product_id = $1 ORDER BY node_id',
      [productId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nodes/:id?product_id=global
router.get('/:id', async (req, res) => {
  const productId = req.query.product_id || 'global';
  try {
    const { rows } = await db.query(
      'SELECT * FROM nodes WHERE node_id = $1 AND product_id = $2',
      [req.params.id, productId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Node not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nodes — 노드 생성
router.post('/', async (req, res) => {
  const { node_id, product_id = 'global', meta, inputs = [], processes = [], outputs = [] } = req.body;
  if (!node_id || !meta) return res.status(400).json({ error: 'node_id, meta 필수' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO nodes (node_id, product_id, meta, inputs, processes, outputs, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING version`,
      [node_id, product_id, meta, JSON.stringify(inputs), JSON.stringify(processes), JSON.stringify(outputs), req.headers['x-user'] || 'system']
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_log (node_id, product_id, action, changed_by, new_data)
       VALUES ($1, $2, 'create', $3, $4)`,
      [node_id, product_id, req.headers['x-user'] || 'system', req.body]
    );

    await client.query('COMMIT');

    // WebSocket broadcast
    const io = req.app.get('io');
    io.emit('node:created', { node_id, meta });

    res.status(201).json({ status: 'created', node_id, version: rows[0].version });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: '이미 존재하는 node_id/product_id 조합' });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/nodes/:id — 노드 수정 (Optimistic Locking)
router.put('/:id', async (req, res) => {
  const { product_id = 'global', meta, inputs, processes, outputs, version } = req.body;
  if (!version) return res.status(400).json({ error: 'version 필수 (Optimistic Locking)' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 이전 데이터 스냅샷
    const { rows: prev } = await client.query(
      'SELECT * FROM nodes WHERE node_id = $1 AND product_id = $2',
      [req.params.id, product_id]
    );
    if (prev.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Node not found' }); }

    // Optimistic Lock: version 일치 확인
    const { rows: updated } = await client.query(
      `UPDATE nodes SET
         meta = COALESCE($1, meta),
         inputs = COALESCE($2, inputs),
         processes = COALESCE($3, processes),
         outputs = COALESCE($4, outputs),
         version = version + 1,
         updated_by = $5,
         updated_at = NOW()
       WHERE node_id = $6 AND product_id = $7 AND version = $8
       RETURNING version`,
      [meta ? JSON.stringify(meta) : null, inputs ? JSON.stringify(inputs) : null,
       processes ? JSON.stringify(processes) : null, outputs ? JSON.stringify(outputs) : null,
       req.headers['x-user'] || 'system', req.params.id, product_id, version]
    );

    if (updated.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '다른 사용자가 이미 수정함. 새로고침 후 재시도 필요 (version conflict)' });
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_log (node_id, product_id, action, changed_by, prev_data, new_data)
       VALUES ($1, $2, 'update', $3, $4, $5)`,
      [req.params.id, product_id, req.headers['x-user'] || 'system', prev[0], req.body]
    );

    await client.query('COMMIT');

    const io = req.app.get('io');
    io.emit('node:updated', { node_id: req.params.id, meta: meta || prev[0].meta });

    res.json({ status: 'updated', version: updated[0].version });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/nodes/:id?product_id=global
router.delete('/:id', async (req, res) => {
  const productId = req.query.product_id || 'global';
  try {
    const { rowCount } = await db.query(
      'DELETE FROM nodes WHERE node_id = $1 AND product_id = $2',
      [req.params.id, productId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Node not found' });

    const io = req.app.get('io');
    io.emit('node:deleted', { node_id: req.params.id });

    res.json({ status: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
