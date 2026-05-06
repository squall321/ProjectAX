import { create } from 'zustand';

const API_BASE = '/api';

export const useOntologyStore = create((set, get) => ({
  nodes: [],
  links: [],
  warnings: [],
  stats: null,
  products: [],
  selectedProduct: 'global',
  loading: false,
  error: null,

  setSelectedProduct: (productId) => {
    set({ selectedProduct: productId });
    get().fetchOntology(productId);
  },

  fetchOntology: async (productId) => {
    const pid = productId || get().selectedProduct;
    set({ loading: true, error: null });
    
    // --- OFFLINE MODE CHECK ---
    if (window.__CAE_STATIC_DATA__) {
      const data = window.__CAE_STATIC_DATA__;
      // Filter nodes and links dynamically based on requested product
      const filteredNodes = !pid ? data.nodes : data.nodes.filter(n => n.product_id === pid || n.product_id === 'global' || !n.product_id);
      const filteredLinks = !pid ? data.links : data.links.filter(l => 
        filteredNodes.some(n => n.node_id === l.source) && 
        filteredNodes.some(n => n.node_id === l.target)
      );
      
      set({
        nodes: filteredNodes,
        links: filteredLinks,
        warnings: [], // Warnings can be derived or ignored in offline mode
        stats: { node_count: filteredNodes.length, link_count: filteredLinks.length, warning_count: 0 },
        loading: false
      });
      return;
    }
    // -------------------------

    try {
      const res = await fetch(`${API_BASE}/ontology?product_id=${pid}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      set({
        nodes: data.nodes,
        links: data.links,
        warnings: data.warnings,
        stats: data.stats,
        loading: false
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchProducts: async () => {
    // --- OFFLINE MODE CHECK ---
    if (window.__CAE_STATIC_DATA__) {
      set({ products: window.__CAE_STATIC_DATA__.products });
      return;
    }
    // -------------------------

    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      set({ products: data });
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  },

  updateNodePosition: (nodeId, x, y) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n)
    }));
  },

  updateAllNodes: (nodes) => {
    set({ nodes });
  }
}));
