import { useState, useEffect } from 'react';
import './RegistryView.css';

export default function RegistryView() {
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Edit mode toggle
  const [isEdit, setIsEdit] = useState(false);

  // Form state
  const [formatId, setFormatId] = useState('');
  const [name, setName] = useState('');
  const [dataClass, setDataClass] = useState('binary_link');
  const [schema, setSchema] = useState('{}');
  const [description, setDescription] = useState('');

  const fetchFormats = () => {
    setLoading(true);
    if (window.__CAE_STATIC_DATA__) {
      setFormats(window.__CAE_STATIC_DATA__.registry || []);
      setLoading(false);
      return;
    }
    fetch('/api/registry')
      .then(r => r.json())
      .then(d => setFormats(d.formats || []))
      .catch(err => setMessage({ type: 'error', text: '포맷 로드 실패' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFormats();
  }, []);

  const resetForm = () => {
    setFormatId('');
    setName('');
    setDataClass('binary_link');
    setSchema('{}');
    setDescription('');
    setIsEdit(false);
  };

  const handleEdit = (f) => {
    setFormatId(f.format_id);
    setName(f.name);
    setDataClass(f.data_class || 'binary_link');
    setSchema(JSON.stringify(f.embedded_schema || {}, null, 2));
    setDescription(f.description || '');
    setIsEdit(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!formatId.trim() || !name.trim()) {
      setMessage({ type: 'error', text: '포맷 ID와 이름은 필수입니다.' });
      return;
    }

    let parsedSchema = {};
    try {
      parsedSchema = JSON.parse(schema);
    } catch (e) {
      setMessage({ type: 'error', text: '스키마는 유효한 JSON이어야 합니다.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (window.__CAE_STATIC_DATA__) {
        setMessage({ type: 'error', text: '오프라인 앱에서는 포맷 추가/수정이 불가능합니다.' });
        setLoading(false);
        return;
      }

      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          format_id: formatId, 
          name, 
          data_class: dataClass,
          embedded_schema: parsedSchema,
          description 
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '저장 실패');
      }

      setMessage({ type: 'ok', text: `포맷이 ${isEdit ? '수정' : '등록'}되었습니다.` });
      resetForm();
      fetchFormats();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    fetch('/api/system/export')
      .then(r => r.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cae_ontology_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      });
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        const res = await fetch('/api/system/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (res.ok) {
          setMessage({ type: 'ok', text: result.message });
          fetchFormats();
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        setMessage({ type: 'error', text: '가져오기 실패: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="registry-container">
      <h1 className="registry-title">Schema Registry — 데이터 포맷 관리</h1>

      {message && <div className={`msg ${message.type}`}>{message.text}</div>}

      <div className="registry-layout">
        {/* ... existing form ... */}
        {/* Registration/Edit Form */}
        <div className="registry-form-card">
          <h2 className="card-title">{isEdit ? '포맷 수정' : '신규 포맷 등록'}</h2>
          {/* ... inputs ... */}
          <div className="form-group">
            <label>Format ID</label>
            <input value={formatId} onChange={e => setFormatId(e.target.value)} disabled={isEdit} placeholder="fmt_new_data" />
          </div>
          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="신규 데이터 규격" />
          </div>
          <div className="form-group">
            <label>Data Class</label>
            <select value={dataClass} onChange={e => setDataClass(e.target.value)}>
              <option value="binary_link">Binary Link (SMB/Link)</option>
              <option value="embedded">Embedded (JSON Data)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="데이터 용도 설명" />
          </div>
          <div className="form-group">
            <label>JSON Schema (Embedded)</label>
            <textarea value={schema} onChange={e => setSchema(e.target.value)} placeholder='{"type":"object", ...}' rows={8} />
          </div>
          <div className="form-actions-stack">
            <button className="btn-register" onClick={handleSubmit} disabled={loading}>{loading ? '처리 중...' : (isEdit ? '수정 내용 저장' : '포맷 등록')}</button>
            {isEdit && <button className="btn-cancel" onClick={resetForm}>취소</button>}
          </div>

          <div className="admin-section">
            <h3 className="admin-label">전체 데이터 관리</h3>
            <div className="admin-actions">
              <button className="btn-export" onClick={handleExport}>📥 백업 (Export JSON)</button>
              <label className="btn-import">
                📤 복구 (Import JSON)
                <input type="file" onChange={handleImport} hidden accept=".json" />
              </label>
            </div>
          </div>
        </div>
        {/* ... existing list ... */}


        {/* Existing Formats List */}
        <div className="registry-list-card">
          <h2 className="card-title">등록된 포맷 리스트</h2>
          <div className="format-grid">
            {formats.map(f => (
              <div key={f.format_id} className="format-item">
                <div className="format-header">
                  <div className="f-title-group">
                    <span className="f-id">{f.format_id}</span>
                    <span className="f-name">{f.name}</span>
                  </div>
                  <button className="btn-edit-small" onClick={() => handleEdit(f)}>수정</button>
                </div>
                <div className="f-meta-row">
                  <span className={`f-badge type-${f.data_class}`}>{f.data_class}</span>
                  <span className="f-desc">{f.description}</span>
                </div>
                <pre className="f-schema">{JSON.stringify(f.embedded_schema || {}, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
