import { useMemo } from 'react';

export default function LinkLayer({ nodes, links, hoveredNode }) {
  const nodeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [nodes]);

  // 연결된 링크 판별
  const isActive = (link) =>
    hoveredNode && (link.source === hoveredNode || link.target === hoveredNode);

  return (
    <svg className="svg-layer">
      <defs>
        <marker id="arrow-normal" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(148, 163, 184, 0.4)" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
        </marker>
        <marker id="arrow-core" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#c084fc" />
        </marker>
      </defs>

      {links.map((link, i) => {
        const src = nodeMap[link.source];
        const tgt = nodeMap[link.target];
        if (!src || !tgt) return null;

        const active = isActive(link);
        const isCore = tgt.type === 'core';
        const nodeW = 230, nodeH = 120;

        let d, labelX, labelY;

        if (src.x <= tgt.x) {
          // 정방향: 소스 오른쪽 → 타겟 왼쪽
          const sx = src.x + nodeW;
          const sy = src.y + nodeH / 2;
          const tx = tgt.x;
          const ty = tgt.y + nodeH / 2;
          const curve = Math.max(Math.abs(tx - sx) * 0.5, 50);
          d = `M ${sx} ${sy} C ${sx + curve} ${sy}, ${tx - curve} ${ty}, ${tx} ${ty}`;
          labelX = (sx + tx) / 2;
          labelY = (sy + ty) / 2 - 10;
        } else {
          // 역방향 (Feedback loop): 위로 우회
          const sx = src.x + nodeW / 2;
          const sy = src.y;
          const tx = tgt.x + nodeW / 2;
          const ty = tgt.y;
          const loopH = Math.max(Math.abs(tx - sx) * 0.4, 150);
          d = `M ${sx} ${sy} C ${sx} ${sy - loopH}, ${tx} ${ty - loopH}, ${tx} ${ty}`;
          labelX = (sx + tx) / 2;
          labelY = Math.min(sy, ty) - loopH * 0.7;
        }

        const markerEnd = active
          ? (isCore ? 'url(#arrow-core)' : 'url(#arrow-active)')
          : 'url(#arrow-normal)';

        return (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke={active ? (isCore ? 'rgba(192,132,252,0.9)' : '#60a5fa')
                             : (isCore ? 'rgba(192,132,252,0.3)' : 'rgba(148,163,184,0.4)')}
              strokeWidth={active ? 4 : 2}
              strokeDasharray={active ? '10,10' : (isCore ? '5,5' : 'none')}
              markerEnd={markerEnd}
              style={active && isCore ? { filter: 'drop-shadow(0 0 10px rgba(192,132,252,0.6))' } : {}}
            />
            {link.label && (
              <text
                x={labelX} y={labelY}
                textAnchor="middle"
                fill={active ? '#fff' : 'transparent'}
                fontSize="12"
                fontWeight="600"
                fontFamily="Inter, sans-serif"
                style={active ? { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' } : {}}
              >
                {link.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
