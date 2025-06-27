import { Router } from 'express';
import { searchStations } from '../services/db.js';

const router = Router();

/**
 * GET /api/stations?query=stationName&limit=10
 * Search for stations by name
 */
router.get('/', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    // Validate input
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Query parameter is required',
        message: 'Please provide a search query for station name'
      });
    }
    
    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'Limit must be between 1 and 50'
      });
    }
    
    const stations = await searchStations(query.trim(), parseInt(limit));
    
    res.json({
      success: true,
      data: stations,
      count: stations.length,
      query: query.trim()
    });
    
  } catch (error) {
    console.error('Station search error:', error);
    res.status(500).json({
      error: 'Failed to search stations',
      message: 'Unable to search stations at this time'
    });
  }
});

export default router; 
