
const EGYPTIAN_CITIES = [
  { name: 'Cairo', lat: [30.0444, 30.0900], lon: [31.2357, 31.2600], weight: 30 },
  { name: 'Giza', lat: [29.9500, 30.0200], lon: [31.2000, 31.2500], weight: 15 },
  { name: 'Alexandria', lat: [31.1500, 31.2500], lon: [29.8500, 29.9800], weight: 15 },
  { name: 'Aswan', lat: [24.0500, 24.1000], lon: [32.8500, 32.9200], weight: 3 },
  { name: 'Asyut', lat: [27.1500, 27.2200], lon: [31.1500, 31.2200], weight: 5 },
  { name: 'Beheira', lat: [30.8000, 31.0000], lon: [30.4000, 30.6000], weight: 4 },
  { name: 'Beni Suef', lat: [29.0500, 29.1000], lon: [31.0800, 31.1200], weight: 3 },
  { name: 'Dakahlia', lat: [31.0000, 31.1000], lon: [31.3500, 31.4500], weight: 4 },
  { name: 'Damietta', lat: [31.4000, 31.4500], lon: [31.8000, 31.8500], weight: 2 },
  { name: 'Faiyum', lat: [29.3000, 29.3500], lon: [30.8000, 30.8500], weight: 3 },
  { name: 'Gharbia', lat: [30.8500, 30.9500], lon: [31.0500, 31.1500], weight: 3 },
  { name: 'Ismailia', lat: [30.5500, 30.6500], lon: [32.2500, 32.3500], weight: 3 },
  { name: 'Kafr El Sheikh', lat: [31.1000, 31.1500], lon: [30.9000, 31.0000], weight: 2 },
  { name: 'Luxor', lat: [25.6500, 25.7500], lon: [32.6000, 32.7000], weight: 4 },
  { name: 'Port Said', lat: [31.2500, 31.3000], lon: [32.2800, 32.3200], weight: 2 },
  { name: 'Qalyubia', lat: [30.1500, 30.2500], lon: [31.2000, 31.3000], weight: 3 },
  { name: 'Qena', lat: [26.1500, 26.2000], lon: [32.7000, 32.7500], weight: 2 },
  { name: 'Sharqia', lat: [30.5500, 30.6500], lon: [31.4500, 31.5500], weight: 3 },
  { name: 'Sohag', lat: [26.5500, 26.6000], lon: [31.6500, 31.7000], weight: 2 },
  { name: 'Suez', lat: [29.9500, 30.0000], lon: [32.5200, 32.5700], weight: 2 }
];

const STREET_NAMES = [
  'Tahrir Square', 'Nile Street', 'Garden City', 'Zamalek Avenue',
  'Mohamed Mahmoud', 'Qasr El Nile', 'Talaat Harb', 'Ramses Street',
  'Sphinx Avenue', 'Pyramids Road', 'Salah Salem', 'Corniche El Nile',
  'Kasr Al Ainy', 'Abbas El Akkad', 'Makram Ebeid', 'Ahmed Orabi',
  'Mostafa El Nahas', 'El Merghany', 'El Hegaz', 'El Thawra',
  'October Street', 'Gameat El Dewal', 'Lebanon Square', 'Midan Sphinx',
  'El Horreya Road', 'Kornish Road', 'El Nasr Street', 'El Mahatta Square',
  'El Gomhoreya Street', 'Station Street', 'University Street', 'Market Street'
];

const API_BASE_URL = process.env.LOCATION_SERVICE_URL || 'http://localhost:8004';
const API_ENDPOINT = '/location/test';

const totalWeight = EGYPTIAN_CITIES.reduce((sum, city) => sum + city.weight, 0);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function selectRandomCity() {
  let random = Math.random() * totalWeight;
  
  for (const city of EGYPTIAN_CITIES) {
    random -= city.weight;
    if (random <= 0) {
      return city;
    }
  }
  
  return EGYPTIAN_CITIES[0];
}

function generateAddress(governorate) {
  const number = Math.floor(Math.random() * 999) + 1;
  const street = randomElement(STREET_NAMES);
  return `${number} ${street}`;
}

function generateLocation() {
  const city = selectRandomCity();
  
  return {
    ownerId: generateUUID(),
    ownerType: 'SESSION',
    address: generateAddress(city.name),
    governorate: city.name,
    latitude: randomNumber(city.lat[0], city.lat[1]),
    longitude: randomNumber(city.lon[0], city.lon[1]),
  };
}

async function sendLocationRequest(location) {
  const url = `${API_BASE_URL}${API_ENDPOINT}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(location),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}

async function seedLocations(count = 100000, concurrent = 50) {
  console.log(`🚀 Sending ${count.toLocaleString()} requests to ${API_BASE_URL}${API_ENDPOINT}`);
  console.log(`📊 Concurrent requests: ${concurrent}\n`);

  let totalSent = 0;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  const cityDistribution = {};

  const startTime = Date.now();

  try {
    for (let i = 0; i < count; i += concurrent) {
      const batchSize = Math.min(concurrent, count - i);
      const promises = [];

      for (let j = 0; j < batchSize; j++) {
        const location = generateLocation();
        
        cityDistribution[location.governorate] = (cityDistribution[location.governorate] || 0) + 1;
        
        promises.push(
          sendLocationRequest(location)
            .then(() => {
              successCount++;
            })
            .catch((error) => {
              errorCount++;
              if (errors.length < 10) {
                errors.push({ location, error: error.message });
              }
            })
        );
      }

      await Promise.all(promises);
      totalSent += batchSize;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (totalSent / (Date.now() - startTime) * 1000).toFixed(0);
      const progress = ((totalSent / count) * 100).toFixed(1);
      process.stdout.write(`\r✓ Progress: ${progress}% (${totalSent.toLocaleString()}/${count.toLocaleString()}) | Success: ${successCount.toLocaleString()} | Errors: ${errorCount} | ${rate} req/s | ${elapsed}s`);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const avgRate = (count / (totalTime)).toFixed(0);
    
    console.log(`\n\n✅ Completed in ${totalTime}s (avg ${avgRate} req/s)`);
    console.log(`📊 Success: ${successCount.toLocaleString()}/${count.toLocaleString()} (${((successCount/count)*100).toFixed(1)}%)`);
    
    if (errorCount > 0) {
      console.log(`\n⚠️  Errors: ${errorCount}`);
      if (errors.length > 0) {
        console.log('\nFirst few errors:');
        errors.forEach((err, idx) => {
          console.log(`${idx + 1}. ${err.error}`);
        });
      }
    }
    
    console.log('\n🌍 City Distribution:');
    const sortedCities = Object.entries(cityDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedCities.forEach(([city, count]) => {
      const percentage = ((count / totalSent) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(percentage / 2));
      console.log(`  ${city.padEnd(20)} ${count.toLocaleString().padStart(7)} (${percentage.padStart(5)}%) ${bar}`);
    });

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

const count = parseInt(process.argv[2]) || 100000;
const concurrent = parseInt(process.argv[3]) || 50;

if (count <= 0 || count > 1000000) {
  console.error('❌ Please provide a valid count between 1 and 1,000,000');
  console.error('Usage: node scripts/seed-locations.js [count] [concurrent]');
  console.error('Example: node scripts/seed-locations.js 100000 50');
  process.exit(1);
}

if (concurrent <= 0 || concurrent > 200) {
  console.error('❌ Please provide a valid concurrent value between 1 and 200');
  process.exit(1);
}

console.log('📍 Location Service Seed Script');
console.log('================================');
console.log(`📦 Records to insert: ${count.toLocaleString()}`);
console.log(`🔄 Concurrent requests: ${concurrent}`);
console.log(`🌍 Distribution: Weighted across ${EGYPTIAN_CITIES.length} Egyptian cities`);
console.log('');

seedLocations(count, concurrent).catch((error) => {
  console.error('\n❌ Failed to seed locations:', error.message);
  process.exit(1);
});
