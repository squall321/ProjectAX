import { useRef, useState, useCallback, useEffect } from 'react';
import { useOntologyStore } from '../store/ontologyStore';
import { runAutoLayout, applyRepulsion } from '../utils/autoLayout';
import NodeCard from './NodeCard';
import LinkLayer from './LinkLayer';
import MapToolbar from './MapToolbar';
import './MapView.css';

export default function MapView() {
  const { nodes, links, stats, warnings, loading, fetchOntology, updateAllNodes } = useOntologyStore();
  const cameraRef = useRef(null);
  const [scale, setScale] = useState(0.7);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragNode, setDragNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const initializedRef = useRef(false);

  // 초기 데이터 로드 + Auto-Layout
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      await fetchOntology();

      // fetchOntology 완료 후 store에서 최신 데이터를 가져온다
      const state = useOntologyStore.getState();
      const currentNodes = state.nodes;
      const currentLinks = state.links;

      if (currentNodes.length === 0) return;

      // localStorage 복원 시도
      const saved = localStorage.getItem('cae_ontology_layout');
      if (saved) {
        try {
          const layout = JSON.parse(saved);
          const restored = currentNodes.map(n => ({
            ...n,
            x: layout[n.id]?.x ?? n.x,
            y: layout[n.id]?.y ?? n.y
          }));
          useOntologyStore.getState().updateAllNodes(restored);
          if (layout._camera) {
            setCamera({ x: layout._camera.x, y: layout._camera.y });
            setScale(layout._camera.scale || 0.7);
          }
          return;
        } catch (e) { /* ignore */ }
      }

      // Auto-layout 실행
      const laid = runAutoLayout(currentNodes.map(n => ({ ...n })), currentLinks);
      useOntologyStore.getState().updateAllNodes(laid);
    })();
  }, []);

  // 레이아웃 저장
  const saveLayout = useCallback(() => {
    const state = useOntologyStore.getState();
    const layout = { _camera: { x: camera.x, y: camera.y, scale } };
    state.nodes.forEach(n => { layout[n.id] = { x: n.x, y: n.y }; });
    localStorage.setItem('cae_ontology_layout', JSON.stringify(layout));
  }, [camera, scale]);

  // 줌
  const handleWheel = useCallback((e) => {
    if (e.target.closest('.toolbar')) return;
    e.preventDefault();
    setScale(prev => {
      const next = e.deltaY > 0 ? Math.max(0.25, prev - 0.05) : Math.min(2.5, prev + 0.05);
      return next;
    });
  }, []);

  useEffect(() => {
    const el = cameraRef.current?.parentElement;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el?.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // 팬 시작
  const handleBgMouseDown = (e) => {
    if (e.target.closest('.node-card') || e.target.closest('.toolbar')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
  };

  // 노드 드래그 시작
  const handleNodeDragStart = (nodeId, e) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragNode(nodeId);
    setDragOffset({
      x: e.clientX - (node.x * scale) - camera.x,
      y: e.clientY - (node.y * scale) - camera.y
    });
  };

  // 마우스 이동
  const handleMouseMove = (e) => {
    if (isPanning) {
      setCamera({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (dragNode) {
      const x = Math.max(0, (e.clientX - dragOffset.x - camera.x) / scale);
      const y = Math.max(0, (e.clientY - dragOffset.y - camera.y) / scale);
      useOntologyStore.getState().updateNodePosition(dragNode, x, y);
      applyRepulsion(useOntologyStore.getState().nodes, dragNode, x, y);
    }
  };

  // 마우스 업
  const handleMouseUp = () => {
    if (isPanning || dragNode) saveLayout();
    setIsPanning(false);
    setDragNode(null);
  };

  // 하이라이트 (연결된 노드)
  const connectedIds = new Set();
  if (hoveredNode) {
    connectedIds.add(hoveredNode);
    links.forEach(l => {
      if (l.source === hoveredNode || l.target === hoveredNode) {
        connectedIds.add(l.source);
        connectedIds.add(l.target);
      }
    });
  }

  const resetLayout = async () => {
    localStorage.removeItem('cae_ontology_layout');
    setCamera({ x: 0, y: 0 });
    setScale(0.7);
    await fetchOntology();
    const state = useOntologyStore.getState();
    const laid = runAutoLayout(state.nodes.map(n => ({ ...n })), state.links);
    state.updateAllNodes(laid);
  };

  if (loading && nodes.length === 0) {
    return <div className="loading">Loading ontology data...</div>;
  }

  return (
    <div
      className="map-container"
      onMouseDown={handleBgMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <MapToolbar
        stats={stats}
        warnings={warnings}
        onReset={resetLayout}
      />

      <div
        ref={cameraRef}
        className="camera"
        style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${scale})` }}
      >
        <LinkLayer
          nodes={nodes}
          links={links}
          hoveredNode={hoveredNode}
        />
        <div className="node-layer">
          {nodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              dimmed={hoveredNode && !connectedIds.has(node.id)}
              onDragStart={(e) => handleNodeDragStart(node.id, e)}
              onHover={() => setHoveredNode(node.id)}
              onLeave={() => setHoveredNode(null)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
