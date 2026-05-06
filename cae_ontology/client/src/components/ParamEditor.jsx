import { useState } from 'react';
import './ParamEditor.css';

/**
 * Parameters Key-Value 편집기
 * I/O 항목의 parameters 필드를 동적으로 편집한다.
 * 지원 타입: string, number, number[] (시계열 데이터)
 */
export default function ParamEditor({ params = {}, onChange }) {
  const [newKey, setNewKey] = useState('');

  const entries = Object.entries(params);

  const addParam = () => {
    if (!newKey.trim()) return;
    const key = newKey.trim().replace(/\s+/g, '_');
    if (params[key] !== undefined) return;
    onChange({ ...params, [key]: '' });
    setNewKey('');
  };

  const removeParam = (key) => {
    const next = { ...params };
    delete next[key];
    onChange(next);
  };

  const updateValue = (key, raw) => {
    let val = raw;

    // 자동 타입 감지: 숫자, 배열, 문자열
    if (/^\d+(\.\d+)?$/.test(raw)) {
      val = parseFloat(raw);
    } else if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) val = parsed;
      } catch (e) { /* keep as string */ }
    }

    onChange({ ...params, [key]: val });
  };

  const formatDisplay = (val) => {
    if (Array.isArray(val)) return JSON.stringify(val);
    return String(val);
  };

  const detectType = (val) => {
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'number') return 'number';
    return 'string';
  };

  return (
    <div className="param-editor">
      <div className="param-header">
        <span className="param-label">🔑 PARAMETERS (Key-Value)</span>
      </div>

      {entries.length === 0 && (
        <div className="param-empty">파라미터 없음 — 아래에서 추가</div>
      )}

      {entries.map(([key, val]) => (
        <div key={key} className="param-row">
          <span className="param-key">{key}</span>
          <span className={`param-type type-${detectType(val)}`}>{detectType(val)}</span>
          <input
            className="param-value"
            value={formatDisplay(val)}
            onChange={e => updateValue(key, e.target.value)}
            placeholder="값 입력"
          />
          <button className="btn-param-remove" onClick={() => removeParam(key)}>✕</button>
        </div>
      ))}

      <div className="param-add-row">
        <input
          className="param-new-key"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addParam()}
          placeholder="새 키 이름 (예: peak_acceleration_G)"
        />
        <button className="btn-param-add" onClick={addParam}>+ 추가</button>
      </div>
    </div>
  );
}
