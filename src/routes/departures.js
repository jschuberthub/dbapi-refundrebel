import { Router } from 'express';
import { getDeparturesArrivals } from '../services/db.js';

const router = Router();

/**
 * GET /api/station/:id/departures?minutes=60
 * Get departures and arrivals for a specific station
 */
router.get('/:id/departures', async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes = 60 } = req.query;
    
    // Validate input
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        error: 'Station ID is required',
        message: 'Please provide a valid station ID'
      });
    }
    
    const duration = parseInt(minutes);
    if (isNaN(duration) || duration < 1 || duration > 1440) {
      return res.status(400).json({
        error: 'Invalid minutes parameter',
        message: 'Minutes must be a number between 1 and 1440 (24 hours)'
      });
    }
    
    const result = await getDeparturesArrivals(id.trim(), duration);
    
    res.json({
      success: true,
      stationId: id,
      duration: duration,
      departures: result.departures,
      arrivals: result.arrivals,
      departuresCount: result.departures.length,
      arrivalsCount: result.arrivals.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Departures/arrivals error:', error);
    res.status(500).json({
      error: 'Failed to fetch departures and arrivals',
      message: 'Unable to fetch train information at this time'
    });
  }
});

export default router; 
