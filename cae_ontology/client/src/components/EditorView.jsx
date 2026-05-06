import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ParamEditor from './ParamEditor';
import './EditorView.css';

const EMPTY_IO = { data_id: '', name: '', format_id: '', source_node: '', target_node: '', is_mandatory: false, sla_days: 3, parameters: {} };

export default function EditorView() {
  const { nodeId: editId } = useParams();
  const navigate = useNavigate();

  const [registry, setRegistry] = useState([]);
  const [existingNodes, setExistingNodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [nodeId, setNodeId] = useState('');
  const [productId, setProductId] = useState('global');
  const [meta, setMeta] = useState({ name: '', type: 'component', owner: '', description: '' });
  const [inputs, setInputs] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [version, setVersion] = useState(null);

  // Expanded state for param editors
  const [expandedInp, setExpandedInp] = useState({});
  const [expandedOut, setExpandedOut] = useState({});

  // 레지스트리 + 기존 노드 로드
  useEffect(() => {
    fetch('/api/registry').then(r => r.json()).then(d => setRegistry(d.formats || []));
    fetch('/api/nodes').then(r => r.json()).then(d => setExistingNodes(d));
  }, []);

  // 편집 모드: 기존 노드 로드
  useEffect(() => {
    if (!editId) return;
    fetch(`/api/nodes/${editId}?product_id=${productId}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => {
        setNodeId(data.node_id);
        setMeta(data.meta);
        setInputs(data.inputs || []);
        setProcesses(data.processes || []);
        setOutputs(data.outputs || []);
        setVersion(data.version);
      })
      .catch(() => setMessage({ type: 'error', text: `노드 "${editId}" 로드 실패` }));
  }, [editId, productId]);

  const addInput = () => setInputs([...inputs, { ...EMPTY_IO }]);
  const addOutput = () => setOutputs([...outputs, { ...EMPTY_IO }]);
  const addProcess = () => setProcesses([...processes, { step_id: `p${processes.length + 1}`, name: '', metrics: {} }]);

  const removeInput = (i) => setInputs(inputs.filter((_, idx) => idx !== i));
  const removeOutput = (i) => setOutputs(outputs.filter((_, idx) => idx !== i));
  const removeProcess = (i) => setProcesses(processes.filter((_, idx) => idx !== i));

  const updateInput = (i, field, val) => {
    const next = [...inputs]; next[i] = { ...next[i], [field]: val }; setInputs(next);
  };
  const updateOutput = (i, field, val) => {
    const next = [...outputs]; next[i] = { ...next[i], [field]: val }; setOutputs(next);
  };
  const updateProcess = (i, field, val) => {
    const next = [...processes]; next[i] = { ...next[i], [field]: val }; setProcesses(next);
  };

  const toggleExpandInp = (i) => setExpandedInp(prev => ({ ...prev, [i]: !prev[i] }));
  const toggleExpandOut = (i) => setExpandedOut(prev => ({ ...prev, [i]: !prev[i] }));

  const handleSave = async () => {
    if (!nodeId.trim() || !meta.name.trim()) {
      setMessage({ type: 'error', text: 'Node ID와 이름은 필수 입력' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const body = { node_id: nodeId, product_id: productId, meta, inputs, processes, outputs };
    const isEdit = !!editId && version !== null;

    try {
      let res;
      if (isEdit) {
        body.version = version;
        res = await fetch(`/api/nodes/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch('/api/nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Save failed');

      setMessage({ type: 'ok', text: `${isEdit ? '수정' : '생성'} 완료 (v${result.version})` });
      setVersion(result.version);

      // 노드 목록 갱신
      fetch('/api/nodes').then(r => r.json()).then(d => setExistingNodes(d));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const loadNode = (nid) => {
    navigate(`/editor/${nid}`);
  };

  const newNode = () => {
    setNodeId('');
    setMeta({ name: '', type: 'component', owner: '', description: '' });
    setInputs([]);
    setProcesses([]);
    setOutputs([]);
    setVersion(null);
    setMessage(null);
    navigate('/editor');
  };

  return (
    <div className="editor-container">
      <div className="editor-sidebar">
        <h2 className="sidebar-title">등록된 노드</h2>
        <button className="btn-new" onClick={newNode}>+ 신규 노드</button>
        <div className="node-list">
          {existingNodes.map(n => (
            <div
              key={n.node_id}
              className={`node-list-item ${n.node_id === editId ? 'selected' : ''}`}
              onClick={() => loadNode(n.node_id)}
            >
              <span className={`type-dot type-${n.meta?.type}`} />
              <span className="node-list-name">{n.meta?.name || n.node_id}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="editor-main">
        <h1 className="editor-title">{editId ? `노드 편집: ${editId}` : '신규 노드 생성'}</h1>

        {message && (
          <div className={`msg ${message.type}`}>{message.text}</div>
        )}

        {/* META */}
        <section className="form-section">
          <h3 className="section-label">META</h3>
          <div className="form-grid">
            <label>
              <span>Node ID</span>
              <input value={nodeId} onChange={e => setNodeId(e.target.value)} disabled={!!editId} placeholder="task_battery_sim" />
            </label>
            <label>
              <span>Name</span>
              <input value={meta.name} onChange={e => setMeta({ ...meta, name: e.target.value })} placeholder="배터리 안전성 시뮬레이션" />
            </label>
            <label>
              <span>Type</span>
              <select value={meta.type} onChange={e => setMeta({ ...meta, type: e.target.value })}>
                <option value="component">Component (Domain Task)</option>
                <option value="core">Core (Master Process)</option>
                <option value="thread">Thread (HPC / System)</option>
                <option value="insight">Insight (Feedback Loop)</option>
              </select>
            </label>
            <label>
              <span>Owner</span>
              <input value={meta.owner} onChange={e => setMeta({ ...meta, owner: e.target.value })} placeholder="배터리 그룹" />
            </label>
            <label className="full-width">
              <span>Description</span>
              <input value={meta.description} onChange={e => setMeta({ ...meta, description: e.target.value })} placeholder="Cell 구조파괴 및 팽창 해석" />
            </label>
          </div>
        </section>

        {/* INPUTS */}
        <section className="form-section">
          <div className="section-header">
            <h3 className="section-label">📥 INPUTS</h3>
            <button className="btn-add" onClick={addInput}>+ 추가</button>
          </div>
          {inputs.map((inp, i) => (
            <div key={i} className="io-group">
              <div className="io-row">
                <input placeholder="Name" value={inp.name} onChange={e => updateInput(i, 'name', e.target.value)} />
                <select value={inp.format_id} onChange={e => updateInput(i, 'format_id', e.target.value)}>
                  <option value="">포맷 선택</option>
                  {registry.map(f => <option key={f.format_id} value={f.format_id}>{f.name}</option>)}
                </select>
                <select value={inp.source_node} onChange={e => updateInput(i, 'source_node', e.target.value)}>
                  <option value="">Source Node</option>
                  {existingNodes.map(n => <option key={n.node_id} value={n.node_id}>{n.meta?.name || n.node_id}</option>)}
                </select>
                <label className="checkbox-label">
                  <input type="checkbox" checked={inp.is_mandatory} onChange={e => updateInput(i, 'is_mandatory', e.target.checked)} />
                  필수
                </label>
                <button className={`btn-toggle-param ${expandedInp[i] ? 'active' : ''}`} onClick={() => toggleExpandInp(i)}>
                  {expandedInp[i] ? '🔼 Params' : '🔽 Params'}
                </button>
                <button className="btn-remove" onClick={() => removeInput(i)}>✕</button>
              </div>
              {expandedInp[i] && (
                <ParamEditor
                  params={inp.parameters}
                  onChange={(newParams) => updateInput(i, 'parameters', newParams)}
                />
              )}
            </div>
          ))}
        </section>

        {/* PROCESSES */}
        <section className="form-section">
          <div className="section-header">
            <h3 className="section-label">⚙️ PROCESSES</h3>
            <button className="btn-add" onClick={addProcess}>+ 추가</button>
          </div>
          {processes.map((proc, i) => (
            <div key={i} className="io-row">
              <input placeholder="프로세스 이름" value={proc.name} onChange={e => updateProcess(i, 'name', e.target.value)} className="wide" />
              <button className="btn-remove" onClick={() => removeProcess(i)}>✕</button>
            </div>
          ))}
        </section>

        {/* OUTPUTS */}
        <section className="form-section">
          <div className="section-header">
            <h3 className="section-label">📤 OUTPUTS</h3>
            <button className="btn-add" onClick={addOutput}>+ 추가</button>
          </div>
          {outputs.map((out, i) => (
            <div key={i} className="io-group">
              <div className="io-row">
                <input placeholder="Name" value={out.name} onChange={e => updateOutput(i, 'name', e.target.value)} />
                <select value={out.format_id} onChange={e => updateOutput(i, 'format_id', e.target.value)}>
                  <option value="">포맷 선택</option>
                  {registry.map(f => <option key={f.format_id} value={f.format_id}>{f.name}</option>)}
                </select>
                <select value={out.target_node || ''} onChange={e => updateOutput(i, 'target_node', e.target.value)}>
                  <option value="">Target Node</option>
                  {existingNodes.map(n => <option key={n.node_id} value={n.node_id}>{n.meta?.name || n.node_id}</option>)}
                </select>
                <input type="number" placeholder="SLA(일)" value={out.sla_days || ''} onChange={e => updateOutput(i, 'sla_days', parseInt(e.target.value) || 0)} className="narrow" />
                <button className={`btn-toggle-param ${expandedOut[i] ? 'active' : ''}`} onClick={() => toggleExpandOut(i)}>
                  {expandedOut[i] ? '🔼 Params' : '🔽 Params'}
                </button>
                <button className="btn-remove" onClick={() => removeOutput(i)}>✕</button>
              </div>
              {expandedOut[i] && (
                <ParamEditor
                  params={out.parameters}
                  onChange={(newParams) => updateOutput(i, 'parameters', newParams)}
                />
              )}
            </div>
          ))}
        </section>

        {/* 저장 */}
        <div className="form-actions">
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : (editId ? '수정 저장' : '신규 생성')}
          </button>
          <button className="btn-preview" onClick={() => navigate('/')}>
            🗺️ 맵에서 확인
          </button>
        </div>
      </div>
    </div>
  );
}
