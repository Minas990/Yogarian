
const axios = require('axios');
const { faker } = require('@faker-js/faker');

const SEARCH_URL = 'http://localhost:8009/search/sessions';
const REQUEST_COUNT = 1000;

function randomQuery() {
  // Random Cairo-ish coordinates
  const latitude = faker.location.latitude({ min: 29.9, max: 31.0, precision: 6 });
  const longitude = faker.location.longitude({ min: 30.9, max: 31.4, precision: 6 });
  const radius = faker.number.int({ min: 10000, max: 1000000 });
  const minPrice = faker.number.int({ min: 0, max: 20000 });
  const maxPrice = faker.number.int({ min: minPrice + 1, max: 100000 });
  const minDuration = faker.number.int({ min: 10, max: 60 });
  const startTime = '2026-02-26 00:00:00';
  const limit = faker.number.int({ min: 10, max: 100 });
  return {
    latitude,
    longitude,
    radius,
    minPrice,
    maxPrice,
    minDuration,
    startTime,
    limit
  };
}

async function runTest() {
  const requests = Array.from({ length: REQUEST_COUNT }, (_, i) => {
    const params = randomQuery();
    const start = Date.now();
    return axios.get(SEARCH_URL, { params })
      .then(() => {
        const elapsed = Date.now() - start;
        console.log(`Request ${i + 1}: ${elapsed} ms`);
        return elapsed;
      })
      .catch(err => {
        const elapsed = Date.now() - start;
        console.error(`Request ${i + 1} failed: ${elapsed} ms`, err.response?.status || err.message);
        return elapsed;
      });
  });

  const times = await Promise.all(requests);
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const median = times.length % 2 === 0 ? (times[times.length/2 - 1] + times[times.length/2]) / 2 : times[Math.floor(times.length/2)];
  const min = times[0];
  const max = times[times.length - 1];
  console.log('\nPerformance Table:');
  console.table([
    { Metric: 'Average (ms)', Value: avg.toFixed(2) },
    { Metric: 'Median (ms)', Value: median },
    { Metric: 'Fastest (ms)', Value: min },
    { Metric: 'Slowest (ms)', Value: max }
  ]);
}

runTest();
