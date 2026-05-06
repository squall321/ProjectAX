import { useState, useEffect } from 'react';
import './DiffView.css';

export default function DiffView() {
  const [products, setProducts] = useState([]);
  const [prodA, setProdA] = useState('');
  const [prodB, setProdB] = useState('');
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.__CAE_STATIC_DATA__) {
      setProducts(window.__CAE_STATIC_DATA__.products || []);
      return;
    }
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  const runDiff = async () => {
    if (!prodA || !prodB) return;
    setLoading(true);
    setError(null);
    try {
      if (window.__CAE_STATIC_DATA__) {
        throw new Error('오프라인 환경에서는 실시간 비교 기능을 지원하지 않습니다.');
      }
      const res = await fetch(`/api/diff?a=${prodA}&b=${prodB}`);
      if (!res.ok) throw new Error('Diff 실패');
      setDiff(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="diff-container">
      <h1 className="diff-title">Product Diff — 제품 간 온톨로지 비교</h1>

      <div className="diff-picker">
        <div className="picker-item">
          <label>Product A</label>
          <select value={prodA} onChange={e => setProdA(e.target.value)}>
            <option value="">선택</option>
            {products.filter(p => p.product_id !== 'global').map(p => (
              <option key={p.product_id} value={p.product_id}>{p.name} ({p.product_id})</option>
            ))}
          </select>
        </div>
        <div className="picker-vs">VS</div>
        <div className="picker-item">
          <label>Product B</label>
          <select value={prodB} onChange={e => setProdB(e.target.value)}>
            <option value="">선택</option>
            {products.filter(p => p.product_id !== 'global').map(p => (
              <option key={p.product_id} value={p.product_id}>{p.name} ({p.product_id})</option>
            ))}
          </select>
        </div>
        <button className="btn-diff" onClick={runDiff} disabled={!prodA || !prodB || loading}>
          {loading ? '비교 중...' : '비교 실행'}
        </button>
      </div>

      {error && <div className="diff-error">{error}</div>}

      {diff && (
        <div className="diff-results">
          {/* Summary Cards */}
          <div className="summary-row">
            <div className="summary-card card-a">
              <div className="card-label">{diff.product_a.id}</div>
              <div className="card-stats">{diff.product_a.node_count} Nodes · {diff.product_a.link_count} Links</div>
            </div>
            <div className="summary-card card-b">
              <div className="card-label">{diff.product_b.id}</div>
              <div className="card-stats">{diff.product_b.node_count} Nodes · {diff.product_b.link_count} Links</div>
            </div>
          </div>

          {/* Diff Stats */}
          <div className="diff-stat-row">
            <div className="diff-chip removed">− {diff.summary.only_a} nodes only in A</div>
            <div className="diff-chip added">+ {diff.summary.only_b} nodes only in B</div>
            <div className="diff-chip changed">≠ {diff.summary.changed} nodes changed</div>
            <div className="diff-chip link-r">− {diff.summary.links_only_a} links only in A</div>
            <div className="diff-chip link-a">+ {diff.summary.links_only_b} links only in B</div>
          </div>

          {/* Nodes only in A */}
          {diff.nodes_only_in_a.length > 0 && (
            <section className="diff-section">
              <h3 className="diff-sec-title red">
                <span className="badge-r">−</span> {diff.product_a.id}에만 존재하는 노드
              </h3>
              <table className="diff-table">
                <thead><tr><th>Node ID</th><th>Name</th><th>Type</th></tr></thead>
                <tbody>
                  {diff.nodes_only_in_a.map(n => (
                    <tr key={n.id} className="row-removed">
                      <td>{n.id}</td><td>{n.title}</td><td>{n.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Nodes only in B */}
          {diff.nodes_only_in_b.length > 0 && (
            <section className="diff-section">
              <h3 className="diff-sec-title green">
                <span className="badge-a">+</span> {diff.product_b.id}에만 존재하는 노드
              </h3>
              <table className="diff-table">
                <thead><tr><th>Node ID</th><th>Name</th><th>Type</th></tr></thead>
                <tbody>
                  {diff.nodes_only_in_b.map(n => (
                    <tr key={n.id} className="row-added">
                      <td>{n.id}</td><td>{n.title}</td><td>{n.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Changed nodes */}
          {diff.nodes_changed.length > 0 && (
            <section className="diff-section">
              <h3 className="diff-sec-title yellow">
                <span className="badge-c">≠</span> 내용이 다른 노드
              </h3>
              {diff.nodes_changed.map(n => (
                <div key={n.node_id} className="changed-card">
                  <div className="changed-header">{n.title} ({n.node_id})</div>
                  {n.diffs.map((d, i) => (
                    <div key={i} className="changed-field">
                      <span className="field-name">{d.field}</span>
                      <div className="field-diff">
                        <div className="val-a">A: {JSON.stringify(d.a)}</div>
                        <div className="val-b">B: {JSON.stringify(d.b)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )}

          {/* Link differences */}
          {(diff.links_only_in_a.length > 0 || diff.links_only_in_b.length > 0) && (
            <section className="diff-section">
              <h3 className="diff-sec-title">Edge(Link) 차이</h3>
              <table className="diff-table">
                <thead><tr><th>상태</th><th>Source</th><th>Target</th><th>Label</th></tr></thead>
                <tbody>
                  {diff.links_only_in_a.map((l, i) => (
                    <tr key={`a${i}`} className="row-removed">
                      <td><span className="badge-r">A only</span></td>
                      <td>{l.source}</td><td>{l.target}</td><td>{l.label}</td>
                    </tr>
                  ))}
                  {diff.links_only_in_b.map((l, i) => (
                    <tr key={`b${i}`} className="row-added">
                      <td><span className="badge-a">B only</span></td>
                      <td>{l.source}</td><td>{l.target}</td><td>{l.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {diff.summary.only_a === 0 && diff.summary.only_b === 0 && diff.summary.changed === 0 && (
            <div className="diff-identical">✅ 두 제품의 온톨로지가 동일합니다.</div>
          )}
        </div>
      )}
    </div>
  );
}
