import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import stationRoutes from './routes/stations.js';
import departureRoutes from './routes/departures.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('client'));

// Swagger documentation
try {
  const swaggerDoc = YAML.load('./swagger.yaml');
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
} catch (error) {
  // Swagger documentation not available
}

// API Routes
app.use('/api/stations', stationRoutes);
app.use('/api/station', departureRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Refundrebel Train API is running!',
    timestamp: new Date().toISOString()
  });
});

// Frontend
app.get('/', (req, res) => {
  res.sendFile('client/index.html', { root: '.' });
});

// Error handling
app.use((err, req, res, next) => {
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

app.listen(PORT, () => {
  console.log(`🚂 Refundrebel Train API running on http://localhost:${PORT}`);
}); 
