import { createClient } from 'db-vendo-client';
import { profile as dbProfile } from 'db-vendo-client/p/db/index.js';

// Use the db profile directly with a user agent
const client = createClient(dbProfile, 'refundrebel-train-tracker');

/**
 * Search for stations using db-vendo-client
 * @param {string} query - Search query for station name
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} Array of station objects
 */
export async function searchStations(query, limit = 10) {
  try {
    const results = await client.locations(query, { results: limit });
    
    // Only return stops/stations (not POIs or addresses)
    return results
      .filter(item => item.type === 'stop' || item.type === 'station')
      .map(station => ({
        id: station.id,
        name: station.name,
        city: station.address?.city,
        latitude: station.location?.latitude,
        longitude: station.location?.longitude,
        products: station.products
      }));
  } catch (error) {
    throw new Error('Failed to search stations');
  }
}

/**
 * Get departures and arrivals for a specific station using db-vendo-client
 * @param {string} stationId - Station ID
 * @param {number} duration - Time window in minutes (default: 60)
 * @returns {Promise<Object>} Object with departures and arrivals arrays
 */
export async function getDeparturesArrivals(stationId, duration = 60) {
  try {
    // Get departures and arrivals in parallel
    const [departures, arrivals] = await Promise.all([
      client.departures(stationId, { duration }),
      client.arrivals(stationId, { duration })
    ]);
    
    // Extract the actual train data from the response objects
    const departuresData = departures?.departures || departures?.departure || departures || [];
    const arrivalsData = arrivals?.arrivals || arrivals?.arrival || arrivals || [];
    
    return {
      departures: filterTrainTypes(departuresData),
      arrivals: filterTrainTypes(arrivalsData)
    };
  } catch (error) {
    throw new Error('Failed to fetch departures and arrivals');
  }
}

/**
 * Filter train types to include only actual trains (ICE, EC, IR, RE, RB)
 * Exclude buses, trams, and other non-train vehicles
 * @param {Array} trains - Array of train objects
 * @returns {Array} Filtered array of trains
 */
function filterTrainTypes(trains) {
  // Ensure trains is an array
  if (!Array.isArray(trains)) {
    return [];
  }
  
  // Only include actual trains, exclude buses, trams, etc.
  const allowedTypes = ['ICE', 'EC', 'IR', 'RE', 'RB'];
  const excludedTypes = ['BUS', 'TRAM', 'U', 'FERRY', 'CABLE_CAR', 'TAXI'];
  
  return trains
    .filter(train => {
      if (!train || !train.line) return false;
      
      const product = train.line?.product?.toUpperCase() || '';
      const name = train.line?.name?.toUpperCase() || '';
      const mode = train.line?.mode?.toUpperCase() || '';
      
      // Exclude buses and other non-train vehicles
      if (excludedTypes.some(type => 
        product.includes(type) || name.includes(type) || mode.includes(type)
      )) {
        return false;
      }
      
      // Include only actual trains
      return allowedTypes.some(type => 
        product.includes(type) || name.includes(type)
      );
    })
    .map(train => ({
      tripId: train.tripId,
      direction: train.direction,
      line: {
        id: train.line?.id,
        name: train.line?.name,
        product: train.line?.product,
        mode: train.line?.mode
      },
      when: train.when,
      plannedWhen: train.plannedWhen,
      delay: train.delay,
      platform: train.platform,
      plannedPlatform: train.plannedPlatform,
      stop: {
        id: train.stop?.id,
        name: train.stop?.name
      },
      remarks: train.remarks || []
    }));
} 
