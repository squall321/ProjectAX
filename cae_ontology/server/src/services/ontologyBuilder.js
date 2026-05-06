const db = require('../db');

/**
 * buildOntology(productId)
 *
 * 1. 해당 product의 모든 노드를 DB에서 읽는다
 * 2. 각 노드의 outputs를 순회하며 Edge(Link)를 자동 생성한다
 * 3. inputs 기반 역방향 보강 (outputs에서 빠진 링크 보완)
 * 4. Validation: 존재하지 않는 노드 참조, 미등록 포맷 등을 warnings로 수집
 * 5. 모든 노드의 x, y를 0으로 세팅 (Auto-Layout은 클라이언트 담당)
 */
async function buildOntology(productId) {
  // 1. 노드 전체 로드
  const { rows: rawNodes } = await db.query(
    'SELECT node_id, meta, inputs, processes, outputs FROM nodes WHERE product_id = $1',
    [productId]
  );

  // 레지스트리 로드 (Validation용)
  const { rows: registryRows } = await db.query('SELECT format_id FROM schema_registry');
  const validFormats = new Set(registryRows.map(r => r.format_id));

  const nodeIds = new Set(rawNodes.map(n => n.node_id));
  const warnings = [];
  const links = [];
  const linkSet = new Set(); // 중복 방지: "source->target"
  const extraNodes = []; // 연결되지 않은 I/O를 시각화하기 위한 추가 데이터 노드

  // 2. Outputs 기반 Edge 생성
  rawNodes.forEach(node => {
    const outputs = node.outputs || [];
    outputs.forEach(output => {
      // format_id 유효성 검사
      if (output.format_id && !validFormats.has(output.format_id)) {
        warnings.push(`[${node.node_id}] 미등록 포맷 참조: ${output.format_id}`);
      }

      let targets = Array.isArray(output.target_node) ? output.target_node : [output.target_node];
      targets = targets.filter(t => t);

      if (targets.length === 0) {
        // 연결되지 않은 최종 Output (단말 데이터)
        const dataNodeId = `ext_out_${node.node_id}_${output.data_id}`;
        extraNodes.push({
          node_id: dataNodeId,
          meta: { type: 'data', name: output.name, description: `포맷: ${output.format_id || '없음'}` },
          inputs: [], processes: [], outputs: []
        });
        links.push({
          source: node.node_id,
          target: dataNodeId,
          label: '최종 산출물',
          format_id: output.format_id || null
        });
      } else {
        targets.forEach(target => {
          if (!nodeIds.has(target)) {
            warnings.push(`[${node.node_id}] 존재하지 않는 target_node 참조: ${target}`);
            return;
          }
          const key = `${node.node_id}->${target}`;
          if (!linkSet.has(key)) {
            linkSet.add(key);
            links.push({
              source: node.node_id,
              target: target,
              label: output.name || '',
              format_id: output.format_id || null
            });
          }
        });
      }
    });
  });

  // 3. Inputs 기반 역방향 보강
  rawNodes.forEach(node => {
    const inputs = node.inputs || [];
    inputs.forEach(input => {
      if (input.format_id && !validFormats.has(input.format_id)) {
        warnings.push(`[${node.node_id}] 미등록 포맷 참조: ${input.format_id}`);
      }

      const source = input.source_node;
      if (!source) {
        // 연결되지 않은 외부 Input (외부 데이터)
        const dataNodeId = `ext_in_${node.node_id}_${input.data_id}`;
        extraNodes.push({
          node_id: dataNodeId,
          meta: { type: 'data', name: input.name, description: `포맷: ${input.format_id || '없음'}` },
          inputs: [], processes: [], outputs: []
        });
        links.push({
          source: dataNodeId,
          target: node.node_id,
          label: '외부 데이터',
          format_id: input.format_id || null
        });
        return;
      }

      if (!nodeIds.has(source)) {
        warnings.push(`[${node.node_id}] 존재하지 않는 source_node 참조: ${source}`);
        return;
      }

      const key = `${source}->${node.node_id}`;
      if (!linkSet.has(key)) {
        linkSet.add(key);
        links.push({
          source: source,
          target: node.node_id,
          label: input.name || '',
          format_id: input.format_id || null
        });
      }
    });
  });

  // 4. 단방향 의존성 경고 (A의 output이 B를 가리키는데 B의 input에 A가 없는 경우)
  rawNodes.forEach(node => {
    const outputs = node.outputs || [];
    outputs.forEach(output => {
      const targets = Array.isArray(output.target_node) ? output.target_node : [output.target_node];
      targets.forEach(target => {
        if (!target || !nodeIds.has(target)) return;
        const targetNode = rawNodes.find(n => n.node_id === target);
        if (!targetNode) return;
        const targetInputs = targetNode.inputs || [];
        const hasMatchingInput = targetInputs.some(inp => inp.source_node === node.node_id);
        if (!hasMatchingInput) {
          warnings.push(`[단방향] ${node.node_id} → ${target}: output은 선언했지만, ${target}의 input에 대응 항목 없음`);
        }
      });
    });
  });

  // 5. 노드 포맷 변환 (프론트엔드용, 좌표 0,0)
  const allNodes = [...rawNodes, ...extraNodes];
  const nodes = allNodes.map(n => {
    const inputNames = (n.inputs || []).map(i => i.name);
    const processNames = (n.processes || []).map(p => p.name);
    const outputNames = (n.outputs || []).map(o => o.name);

    return {
      id: n.node_id,
      type: n.meta.type || 'component',
      x: 0,
      y: 0,
      title: n.meta.name || n.node_id,
      desc: n.meta.description || '',
      inputs: inputNames,
      processes: processNames,
      outputs: outputNames,
      detail: {
        owner: n.meta.owner || '',
        raw_inputs: n.inputs,
        raw_outputs: n.outputs
      }
    };
  });

  return {
    nodes,
    links,
    warnings,
    compiled_at: new Date().toISOString(),
    product_id: productId,
    stats: {
      node_count: nodes.length,
      link_count: links.length,
      warning_count: warnings.length
    }
  };
}

module.exports = { buildOntology };
