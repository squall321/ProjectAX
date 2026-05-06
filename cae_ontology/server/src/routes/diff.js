const router = require('express').Router();
const db = require('../db');
const { buildOntology } = require('../services/ontologyBuilder');

// GET /api/diff?a=SM-S928B&b=SM-F956B
router.get('/', async (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) return res.status(400).json({ error: 'a, b 파라미터 필수 (product_id)' });

  try {
    const [ontA, ontB] = await Promise.all([buildOntology(a), buildOntology(b)]);

    const nodeIdsA = new Set(ontA.nodes.map(n => n.id));
    const nodeIdsB = new Set(ontB.nodes.map(n => n.id));

    // 노드 차이
    const onlyInA = ontA.nodes.filter(n => !nodeIdsB.has(n.id));
    const onlyInB = ontB.nodes.filter(n => !nodeIdsA.has(n.id));
    const common = ontA.nodes.filter(n => nodeIdsB.has(n.id));

    // 공통 노드 중 내용이 다른 것 검출
    const changed = [];
    common.forEach(nodeA => {
      const nodeB = ontB.nodes.find(n => n.id === nodeA.id);
      if (!nodeB) return;

      const diffs = [];
      if (nodeA.title !== nodeB.title) diffs.push({ field: 'title', a: nodeA.title, b: nodeB.title });
      if (nodeA.desc !== nodeB.desc) diffs.push({ field: 'description', a: nodeA.desc, b: nodeB.desc });
      if (JSON.stringify(nodeA.inputs) !== JSON.stringify(nodeB.inputs)) diffs.push({ field: 'inputs', a: nodeA.inputs, b: nodeB.inputs });
      if (JSON.stringify(nodeA.outputs) !== JSON.stringify(nodeB.outputs)) diffs.push({ field: 'outputs', a: nodeA.outputs, b: nodeB.outputs });
      if (JSON.stringify(nodeA.processes) !== JSON.stringify(nodeB.processes)) diffs.push({ field: 'processes', a: nodeA.processes, b: nodeB.processes });

      if (diffs.length > 0) changed.push({ node_id: nodeA.id, title: nodeA.title, diffs });
    });

    // 링크 차이
    const linkKeyA = new Set(ontA.links.map(l => `${l.source}->${l.target}`));
    const linkKeyB = new Set(ontB.links.map(l => `${l.source}->${l.target}`));
    const linksOnlyA = ontA.links.filter(l => !linkKeyB.has(`${l.source}->${l.target}`));
    const linksOnlyB = ontB.links.filter(l => !linkKeyA.has(`${l.source}->${l.target}`));

    res.json({
      product_a: { id: a, node_count: ontA.nodes.length, link_count: ontA.links.length },
      product_b: { id: b, node_count: ontB.nodes.length, link_count: ontB.links.length },
      nodes_only_in_a: onlyInA.map(n => ({ id: n.id, title: n.title, type: n.type })),
      nodes_only_in_b: onlyInB.map(n => ({ id: n.id, title: n.title, type: n.type })),
      nodes_changed: changed,
      links_only_in_a: linksOnlyA,
      links_only_in_b: linksOnlyB,
      summary: {
        only_a: onlyInA.length,
        only_b: onlyInB.length,
        changed: changed.length,
        links_only_a: linksOnlyA.length,
        links_only_b: linksOnlyB.length
      }
    });
  } catch (err) {
    console.error('[Diff] error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
