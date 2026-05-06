const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const registryRoutes = require('./routes/registry');
const nodesRoutes = require('./routes/nodes');
const productsRoutes = require('./routes/products');
const ontologyRoutes = require('./routes/ontology');
const diffRoutes = require('./routes/diff');
const systemRoutes = require('./routes/system');
const reportRoutes = require('./routes/report');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Higher limit for data ops

// Socket.io injection
app.set('io', io);

// API Routes
app.use('/api/registry', registryRoutes);
app.use('/api/nodes', nodesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/ontology', ontologyRoutes);
app.use('/api/diff', diffRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/report', reportRoutes); // Separate mount for clarity

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Backward compatibility for cached clients
app.get('/api/system/report/:productId', (req, res) => {
  res.redirect(`/api/report/${req.params.productId}`);
});

// --- Production Build Serving ---
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath, { index: false })); // Disable default index to handle headers manually

// Fallback for SPA routing (with no-cache for index.html to prevent stale clients)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    console.warn(`[404] API Not Found: ${req.path}`);
    return res.status(404).json({ error: 'API not found' });
  }
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[API] CAE Ontology Server running on http://localhost:${PORT}`);
});

