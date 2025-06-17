import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static('public'));

// Read cities list
const citiesData = readFileSync(join(__dirname, 'cities_list.txt'), 'utf-8');
const cities = citiesData.split('\n').filter(city => city.trim()).map(city => city.trim());

// Function to fetch gold price for a city
async function fetchGoldPrice(city) {
  return new Promise((resolve) => {
    try {
      const options = {
        hostname: 'gold-silver-live-price-india.p.rapidapi.com',
        path: '/gold_price_india_city_value/',
        method: 'GET',
        headers: {
          'x-rapidapi-key': 'ff6f2c650amshaa45dcbb3f35310p147e90jsnc32fbac634b8',
          'x-rapidapi-host': 'gold-silver-live-price-india.p.rapidapi.com',
          'city': city
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            const key22k = `${city}_22k`;
            const key24k = `${city}_24k`;
            
            resolve({
              city: city,
              price22k: jsonData[key22k] || 'N/A',
              price24k: jsonData[key24k] || 'N/A',
              unit: jsonData.Unit || 'N/A',
              success: true
            });
          } catch (parseError) {
            resolve({
              city: city,
              price22k: 'Error',
              price24k: 'Error',
              unit: 'N/A',
              success: false,
              error: 'Failed to parse response'
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          city: city,
          price22k: 'Error',
          price24k: 'Error',
          unit: 'N/A',
          success: false,
          error: error.message
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          city: city,
          price22k: 'Error',
          price24k: 'Error',
          unit: 'N/A',
          success: false,
          error: 'Request timeout'
        });
      });

      req.end();
    } catch (error) {
      resolve({
        city: city,
        price22k: 'Error',
        price24k: 'Error',
        unit: 'N/A',
        success: false,
        error: error.message
      });
    }
  });
}

// API endpoint to get cities list
app.get('/api/cities', (req, res) => {
  res.json(cities);
});

// API endpoint to get gold price for a specific city
app.get('/api/city/:cityName', async (req, res) => {
  const cityName = decodeURIComponent(req.params.cityName);
  
  if (!cities.includes(cityName)) {
    return res.status(404).json({ error: 'City not found' });
  }

  const priceData = await fetchGoldPrice(cityName);
  res.json(priceData);
});

// API endpoint to get all cities with prices (for homepage)
app.get('/api/all-prices', async (req, res) => {
  const limit = parseInt(req.query.limit) || cities.length; // Default to all cities
  const citiesToFetch = cities.slice(0, limit);
  
  console.log(`Fetching prices for ${citiesToFetch.length} cities...`);
  
  // Process cities in batches to avoid overwhelming the API
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < citiesToFetch.length; i += batchSize) {
    const batch = citiesToFetch.slice(i, i + batchSize);
    const batchPromises = batch.map(city => fetchGoldPrice(city));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add a small delay between batches to be respectful to the API
    if (i + batchSize < citiesToFetch.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`Successfully fetched prices for ${results.length} cities`);
  res.json(results);
});

// Serve the main HTML file for all routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Gold Price Tracker server running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🏙️  Total cities available: ${cities.length}`);
});