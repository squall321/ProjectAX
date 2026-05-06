import { useOntologyStore } from '../store/ontologyStore';
import './MapToolbar.css';

export default function MapToolbar({ stats, warnings, onReset }) {
  const selectedProduct = useOntologyStore(state => state.selectedProduct) || 'global';

  const downloadReport = async () => {
    try {
      const res = await fetch(`/api/report/export-app`);
      if (!res.ok) throw new Error('App Export failed');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `cae_ontology_offline.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('오프라인 앱 다운로드에 실패했습니다. (클라이언트 빌드가 존재하는지 확인하세요)');
    }
  };




  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="toolbar-title">CAE Workflow Ontology Map</h1>
        <p className="toolbar-subtitle">
          데이터 의존성 기반 프로세스 토폴로지 뷰어 · 
          <b>마우스 휠</b>(줌) · <b>배경 드래그</b>(팬)
        </p>
        {stats && (
          <div className="toolbar-stats">
            <span className="stat-chip">{stats.node_count} Nodes</span>
            <span className="stat-chip">{stats.link_count} Links</span>
            {stats.warning_count > 0 && (
              <span className="stat-chip warn">{stats.warning_count} Warnings</span>
            )}
          </div>
        )}
      </div>
      <div className="toolbar-right">
        <button className="btn-report" onClick={downloadReport}>📦 오프라인 앱 내보내기</button>
        <button className="btn-reset" onClick={onReset}>배열 초기화</button>
      </div>
    </div>
  );
}
