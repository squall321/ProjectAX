/**
 * Force-Directed Auto-Layout (Fruchterman-Reingold)
 *
 * 모든 노드가 (0,0)으로 들어왔을 때, 물리 시뮬레이션으로
 * 겹치지 않는 최적 위치를 자동 산출한다.
 */

const REPULSION = 80000;
const SPRING_LEN = 400;
const SPRING_K = 0.008;
const DAMPING = 0.82;
const MAX_ITER = 250;
const STOP_ENERGY = 0.3;

export function runAutoLayout(nodes, links) {
  const n = nodes.length;
  if (n === 0) return nodes;

  // 1. 초기 시드: 원형 배치 (반경 250px)
  const cx = 800, cy = 500;
  const radius = 250 + n * 20;
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    node.x = cx + radius * Math.cos(angle);
    node.y = cy + radius * Math.sin(angle);
  });

  // 속도 배열
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);

  // 노드 인덱스 맵
  const idxMap = {};
  nodes.forEach((node, i) => { idxMap[node.id] = i; });

  // 2. 반복 시뮬레이션
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);

    // 2a. 척력 (모든 노드 쌍)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (dist * dist);
        const dirX = dx / dist;
        const dirY = dy / dist;
        fx[i] += dirX * force;
        fy[i] += dirY * force;
        fx[j] -= dirX * force;
        fy[j] -= dirY * force;
      }
    }

    // 2b. 인력 (Edge 연결된 쌍만)
    links.forEach(link => {
      const si = idxMap[link.source];
      const ti = idxMap[link.target];
      if (si === undefined || ti === undefined) return;
      let dx = nodes[ti].x - nodes[si].x;
      let dy = nodes[ti].y - nodes[si].y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - SPRING_LEN) * SPRING_K;
      const dirX = dx / dist;
      const dirY = dy / dist;
      fx[si] += dirX * force;
      fy[si] += dirY * force;
      fx[ti] -= dirX * force;
      fy[ti] -= dirY * force;
    });

    // 2c. 속도 업데이트 + 위치 업데이트
    let totalEnergy = 0;
    for (let i = 0; i < n; i++) {
      vx[i] = (vx[i] + fx[i]) * DAMPING;
      vy[i] = (vy[i] + fy[i]) * DAMPING;
      nodes[i].x += vx[i];
      nodes[i].y += vy[i];
      // 화면 밖으로 나가지 않도록
      nodes[i].x = Math.max(50, nodes[i].x);
      nodes[i].y = Math.max(50, nodes[i].y);
      totalEnergy += vx[i] * vx[i] + vy[i] * vy[i];
    }

    // 2d. 수렴 판정
    if (totalEnergy < STOP_ENERGY) break;
  }

  return nodes;
}

/**
 * 드래그 시 주변 노드를 밀어내는 충돌 회피
 */
export function applyRepulsion(nodes, activeId, ax, ay) {
  const MIN_DIST = 280;
  const STRENGTH = 15;
  let moved = false;

  nodes.forEach(node => {
    if (node.id === activeId) return;
    const dx = node.x - ax;
    const dy = node.y - ay;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MIN_DIST && dist > 0) {
      const force = (MIN_DIST - dist) / MIN_DIST;
      node.x += (dx / dist) * force * STRENGTH;
      node.y += (dy / dist) * force * STRENGTH;
      node.x = Math.max(0, node.x);
      node.y = Math.max(0, node.y);
      moved = true;
    }
  });

  return moved;
}
