const https = require('http');

const AUTH_SERVICE_URL = 'http://localhost:8001';
const TOTAL_USERS = 10000;
const CONCURRENT_REQUESTS = 50; 

async function createUser(index) {
  const userData = {
    email: `testuser${index}@loadtest.com`,
    name: `Test User ${index}`,
    password: 'TestPassword123!',
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(userData);
    
    const options = {
      hostname: 'localhost',
      port: 8001,
      path: '/auth/signup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve({ success: true, email: userData.email });
        } else {
          resolve({ success: false, email: userData.email, status: res.statusCode, body });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, email: userData.email, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

async function runLoadTest() {
  console.log(`Starting load test: ${TOTAL_USERS} users with ${CONCURRENT_REQUESTS} concurrent requests`);
  const startTime = Date.now();
  
  let completed = 0;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < TOTAL_USERS; i += CONCURRENT_REQUESTS) {
    const batch = [];
    const batchSize = Math.min(CONCURRENT_REQUESTS, TOTAL_USERS - i);
    
    for (let j = 0; j < batchSize; j++) {
      batch.push(createUser(i + j));
    }

    const results = await Promise.all(batch);
    
    results.forEach(result => {
      completed++;
      if (result.success) {
        successful++;
      } else {
        failed++;
        if (failed <= 10) { 
          console.error(`Failed: ${result.email} - ${result.error || result.status}`);
        }
      }
    });

    //progress
    if (completed % 500 === 0 || completed === TOTAL_USERS) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const rate = (completed / elapsed).toFixed(2);
      console.log(`Progress: ${completed}/${TOTAL_USERS} (${successful} success, ${failed} failed) - ${rate} req/s`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgRate = (TOTAL_USERS / totalTime).toFixed(2);

  console.log('\ncomplete!');
  console.log(`total: ${TOTAL_USERS}`);
  console.log(`success: ${successful}`);
  console.log(`failed: ${failed}`);
  console.log(`overall: ${totalTime}s`);
  console.log(`Avg rate: ${avgRate} req/s`);
}

runLoadTest().catch(console.error);
