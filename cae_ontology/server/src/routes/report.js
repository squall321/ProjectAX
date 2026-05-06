const router = require('express').Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * GET /api/report/export-app
 * 전체 애플리케이션과 데이터를 정적 오프라인 패키지로 압축하여 다운로드합니다.
 */
router.get('/export-app', async (req, res) => {
  try {
    const clientDistPath = path.join(__dirname, '../../../client/dist');
    const indexHtmlPath = path.join(clientDistPath, 'index.html');

    // 1. 빌드 폴더 확인
    if (!fs.existsSync(clientDistPath) || !fs.existsSync(indexHtmlPath)) {
      return res.status(500).json({ error: '프론트엔드 빌드 파일이 없습니다. 먼저 클라이언트를 빌드해주세요.' });
    }

    // 2. 현재 DB의 모든 데이터 수집
    const { rows: products } = await db.query('SELECT * FROM products');
    const { rows: registry } = await db.query('SELECT * FROM schema_registry');
    
    // Nodes 데이터 수집 후 링크 자동 생성 (ontology 로직 재사용 가능, 여기선 단순화)
    const { rows: rawNodes } = await db.query('SELECT * FROM nodes');
    const links = [];
    rawNodes.forEach(node => {
      (node.outputs || []).forEach(out => {
        if (out.target_node) {
          links.push({
            id: `${node.node_id}-${out.target_node}`,
            source: node.node_id,
            target: out.target_node,
            data_format: out.format || 'unknown'
          });
        }
      });
    });

    // 오프라인 전용 데이터 스크립트 텍스트 생성
    const formattedNodes = rawNodes.map(n => {
      const inputNames = (n.inputs || []).map(i => i.name);
      const processNames = (n.processes || []).map(p => p.name);
      const outputNames = (n.outputs || []).map(o => o.name);

      return {
        id: n.node_id,
        node_id: n.node_id, // keep for backward compatibility
        product_id: n.product_id, // required for offline filtering
        type: (n.meta && n.meta.type) || 'component',
        x: 0,
        y: 0,
        title: (n.meta && n.meta.name) || n.node_id,
        desc: (n.meta && n.meta.description) || '',
        inputs: inputNames,
        processes: processNames,
        outputs: outputNames,
        detail: {
          owner: (n.meta && n.meta.owner) || '',
          raw_inputs: n.inputs,
          raw_outputs: n.outputs
        }
      };
    });

    const staticData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      products,
      registry,
      nodes: formattedNodes,
      links
    };
    
    const dataJsContent = `<script>window.__CAE_STATIC_DATA__ = ${JSON.stringify(staticData)};</script>`;

    // 3. index.html 수정 (data.js 스크립트를 <head>에 주입)
    let indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    if (indexHtmlContent.includes('<head>')) {
      indexHtmlContent = indexHtmlContent.replace('<head>', `<head>${dataJsContent}`);
    } else {
      indexHtmlContent = `${dataJsContent}` + indexHtmlContent;
    }

    // 4. 단일 HTML 파일로 직접 응답 (ZIP 불필요)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cae_ontology_offline.html"');
    res.setHeader('Cache-Control', 'no-cache');
    
    res.send(indexHtmlContent);

  } catch (err) {
    console.error('[ExportApp] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// 기존의 단순 HTML 리포트 (유지)
router.get('/:productId', async (req, res) => {
  // 기존 코드 생략... export-app을 위에 두어 라우팅 충돌 방지
  if (req.params.productId === 'export-app') return; // 방어 코드

  const { productId } = req.params;
  // ... existing code
  
  try {
    const { rows: productRows } = await db.query('SELECT * FROM products WHERE product_id = $1', [productId]);
    const product = productRows[0] || { name: productId, product_id: productId };
    const { rows: nodes } = await db.query('SELECT * FROM nodes WHERE product_id = $1 OR product_id = \'global\'', [productId]);
    
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>CAE Ontology Report - ${product.name}</title>
    <style>body { font-family: sans-serif; padding: 20px; }</style>
</head>
<body>
    <h1>${product.name} 워크플로우</h1>
    <ul>${nodes.map(n => `<li>${n.meta.name}</li>`).join('')}</ul>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="CAE_Report_${productId}.html"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
