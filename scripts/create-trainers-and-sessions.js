// Script to create 100 trainers and 1000 sessions for each trainer

const axios = require('axios');
const { faker } = require('@faker-js/faker');
const fs = require('fs');

const AUTH_URL = 'http://localhost:8001/auth/signup'; 
const SESSION_URL = 'http://localhost:8005/sessions'; 

const TRAINER_COUNT = 500;
const SESSIONS_PER_TRAINER = 500;

async function createTrainer(index) {
  const email = `trainer${index}@example.com`;
  const password = 'test';
  const name = faker.person.firstName();
  const phoneNumber = "01559482319";
  const role = 'TRAINER';
  const payload = {
    email,
    password,
    name,
    role,
    phoneNumber
  };
  try {
    const res = await axios.post(AUTH_URL, payload);
    return { userId: res.data.user.userId, email, password };
  } catch (err) {
    console.error(`Failed to create trainer ${email}:`, err.response?.data || err.message);
    return null;
  }
}

async function loginTrainer(email, password) {
  try {
    const res = await axios.post('http://localhost:8001/auth/login', { email, password });
    return res.data.token;
  } catch (err) {
    console.error(`Failed to login trainer ${email}:`, err.response?.data || err.message);
    return null;
  }
}

async function createSession(token, trainerIndex, sessionIndex) {
  const title = faker.company.catchPhrase();
  const description = faker.lorem.sentence();
  const maxParticipants = faker.number.int({ min: 5, max: 30 });
  const startTime = faker.date.between({ from: '2026-03-01T09:00:00.000Z', to: '2026-03-30T09:00:00.000Z' }).toISOString();
  const duration = faker.number.int({ min: 30, max: 120 });
  const price = faker.number.int({ min: 10000, max: 30000 });
  const notes = faker.lorem.sentence();
  const latitude = faker.location.latitude({ min: 30.0, max: 31.0, precision: 5 });
  const longitude = faker.location.longitude({ min: 30.0, max: 31.0, precision: 5 });
  const payload = {
    title,
    description,
    maxParticipants,
    startTime,
    duration,
    price,
    notes,
    location: {
      address: faker.location.streetAddress(),
      city: 'Cairo',
      governorate: 'Cairo',
      latitude,
      longitude
    }
  };

  try {
    await axios.post(SESSION_URL, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.error(`Failed to create session for trainer ${trainerIndex}, session ${sessionIndex}:`, err.response?.data || err.message);
  }
}

(async () => {
  for (let i = 1; i <= TRAINER_COUNT; i++) {
    const trainer = await createTrainer(i);
    if (!trainer) continue;
    const token = await loginTrainer(trainer.email, trainer.password);
    if (!token) continue;
    for (let j = 1; j <= SESSIONS_PER_TRAINER; j++) {
      await createSession(token, i, j);
    }
    console.log(`Created ${SESSIONS_PER_TRAINER} sessions for trainer ${i}`);
  }
  console.log('Done creating trainers and sessions.');
})();
