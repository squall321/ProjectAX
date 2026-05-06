import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import MapView from './components/MapView';
import EditorView from './components/EditorView';
import DiffView from './components/DiffView';
import RegistryView from './components/RegistryView';
import './App.css';

export default function App() {
  return (
    <HashRouter>
      <nav className="app-nav">
        <NavLink to="/" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          🗺️ Map
        </NavLink>
        <NavLink to="/editor" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          ✏️ Editor
        </NavLink>
        <NavLink to="/diff" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          🔀 Diff
        </NavLink>
        <NavLink to="/registry" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          📁 Registry
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/editor" element={<EditorView />} />
        <Route path="/editor/:nodeId" element={<EditorView />} />
        <Route path="/diff" element={<DiffView />} />
        <Route path="/registry" element={<RegistryView />} />
      </Routes>
    </HashRouter>
  );
}
