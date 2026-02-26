const axios = require('axios');
const { faker } = require('@faker-js/faker');

const SEARCH_URL = 'http://localhost:8009/search/sessions';
const REQUEST_COUNT = 1000;
const CONCURRENCY = 40  ; // max requests in-flight at once

function randomQuery() {
  const latitude = faker.location.latitude({ min: 29.9, max: 31.0, precision: 6 });
  const longitude = faker.location.longitude({ min: 30.9, max: 31.4, precision: 6 });
  const radius = faker.number.int({ min: 10000, max: 1000000 });
  const minPrice = faker.number.int({ min: 0, max: 20000 });
  const maxPrice = faker.number.int({ min: minPrice + 1, max: 100000 });
  const minDuration = faker.number.int({ min: 10, max: 60 });
  const startTime = '2026-02-26 00:00:00';
  const limit = faker.number.int({ min: 10, max: 100 });
  return { latitude, longitude, radius, minPrice, maxPrice, minDuration, startTime, limit };
}

async function runWithConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const p = Promise.resolve().then(task).then(r => {
      executing.delete(p);
      return r;
    });
    executing.add(p);
    results.push(p);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

async function runTest() {
  const replicaHits = {};
  let successCount = 0;
  let failCount = 0;

  const tasks = Array.from({ length: REQUEST_COUNT }, (_, i) => async () => {
    const params = randomQuery();
    const start = Date.now();
    try {
      const res = await axios.get(SEARCH_URL, { params, timeout: 15000 });
      const elapsed = Date.now() - start;
      const replica = res.headers['x-replica'] || 'unknown';
      replicaHits[replica] = (replicaHits[replica] || 0) + 1;
      successCount++;
      console.log(`Request ${i + 1}: ${elapsed} ms → ${replica}`);
      return elapsed;
    } catch (err) {
      const elapsed = Date.now() - start;
      failCount++;
      console.error(`Request ${i + 1} failed: ${elapsed} ms`, err.response?.status || err.message);
      return elapsed;
    }
  });

  const times = await runWithConcurrency(tasks, CONCURRENCY);
  times.sort((a, b) => a - b);

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const median = times.length % 2 === 0
    ? (times[times.length / 2 - 1] + times[times.length / 2]) / 2
    : times[Math.floor(times.length / 2)];

  console.log('\n── Performance ──────────────────────────');
  console.table([
    { Metric: 'Total Requests',  Value: REQUEST_COUNT },
    { Metric: 'Succeeded',       Value: successCount },
    { Metric: 'Failed',          Value: failCount },
    { Metric: 'Concurrency',     Value: CONCURRENCY },
    { Metric: 'Average (ms)',    Value: avg.toFixed(2) },
    { Metric: 'Median (ms)',     Value: median },
    { Metric: 'Fastest (ms)',    Value: times[0] },
    { Metric: 'Slowest (ms)',    Value: times[times.length - 1] },
  ]);

  console.log('\n── Replica Distribution ─────────────────');
  const totalHits = Object.values(replicaHits).reduce((a, b) => a + b, 0);
  const replicaRows = Object.entries(replicaHits)
    .sort((a, b) => b[1] - a[1])
    .map(([replica, hits]) => ({
      Replica: replica,
      Requests: hits,
      '%': ((hits / totalHits) * 100).toFixed(1) + '%',
    }));

  console.table(replicaRows);
  console.log(`Total replicas that served traffic: ${Object.keys(replicaHits).length}`);
}

runTest();