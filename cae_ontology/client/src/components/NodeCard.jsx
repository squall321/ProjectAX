import './NodeCard.css';

const TYPE_CONFIG = {
  component: { badge: 'Domain Task', color: '#f43f5e' },
  core:      { badge: 'Master Process', color: '#c084fc' },
  thread:    { badge: 'HPC / System', color: '#34d399' },
  insight:   { badge: 'Feedback Loop', color: '#60a5fa' }
};

export default function NodeCard({ node, dimmed, onDragStart, onHover, onLeave }) {
  const config = TYPE_CONFIG[node.type] || TYPE_CONFIG.component;

  return (
    <div
      className={`node-card ${dimmed ? 'dimmed' : ''} type-${node.type}`}
      style={{ left: node.x, top: node.y }}
      onMouseDown={onDragStart}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="node-badge" style={{ color: config.color }}>{config.badge}</div>
      <div className="node-title">{node.title}</div>
      <div className="node-desc">{node.desc}</div>

      {node.inputs?.length > 0 && (
        <div className="node-section">
          <div className="sec-title">📥 INPUTS</div>
          <ul className="sec-list">
            {node.inputs.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {node.processes?.length > 0 && (
        <div className="node-section">
          <div className="sec-title">⚙️ PROCESSES</div>
          <ul className="sec-list">
            {node.processes.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {node.outputs?.length > 0 && (
        <div className="node-section">
          <div className="sec-title">📤 OUTPUTS</div>
          <ul className="sec-list">
            {node.outputs.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {node.detail?.owner && (
        <div className="node-owner">👤 {node.detail.owner}</div>
      )}
    </div>
  );
}
