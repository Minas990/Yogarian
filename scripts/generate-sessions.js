// scripts/generate-sessions.js
// Script to generate 1000 sessions near a specific location

const axios = require('axios');

const SESSIONS_SERVICE_URL = 'http://localhost:8005/sessions'; // Adjust if needed
const LOGIN_URL = 'http://localhost:8001/auth/login'; // Adjust if needed

const TRAINER_EMAIL = 'trainer1@example.com';
const TRAINER_PASSWORD = 'test';

const BASE_LOCATION = {
  address: '123 Nile Street',
  city: 'Cairo',
  latitude: 31.014,
  longitude: 30.20357,
  governorate: 'Cairo',
};

function randomizeSession(i) {
  // Randomize title, description, time, price, etc.
  const startTime = new Date(Date.now() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000); // Random day in next week, 9am
  return {
    title: `Yoga Session #${i + 1}`,
    description: `Session #${i + 1}: A relaxing yoga session for all levels.`,
    maxParticipants: 10 + Math.floor(Math.random() * 10),
    startTime: startTime.toISOString(),
    duration: 60 + Math.floor(Math.random() * 60),
    price: 10000 + Math.floor(Math.random() * 10000),
    notes: 'Please bring your own yoga mat.',
    location: { ...BASE_LOCATION },
  };
}

async function main() {
  // Login as trainer
  let token;
  try {
    const loginRes = await axios.post(LOGIN_URL, {
      email: TRAINER_EMAIL,
      password: TRAINER_PASSWORD,
    });
    token = loginRes.data.accessToken || loginRes.data.token;
    if (!token) throw new Error('No token received');
    console.log('Logged in as trainer');
  } catch (err) {
    console.error('Trainer login failed:', err.response?.data || err.message);
    return;
  }

  for (let i = 0; i < 1000; i++) {
    const session = randomizeSession(i);
    try {
      await axios.post(
        SESSIONS_SERVICE_URL,
        session,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if ((i + 1) % 50 === 0) console.log(`Created ${i + 1} sessions`);
    } catch (err) {
      console.error(`Error creating session #${i + 1}:`, err.response?.data || err.message);
    }
  }
  console.log('Done creating sessions');
}

main();
