// scripts/create-test-users.js
// Script to create 10 test users and update their location

const axios = require('axios');
const { ca } = require('zod/v4/locales');

const USERS_SERVICE_URL = 'http://localhost:8001/auth'; // Adjust if needed
const LOCATION_SERVICE_URL = 'http://localhost:8004/location/user';

const users = Array.from({ length: 10 }, (_, i) => ({
  email: `test${i + 1}@example.com`,
  password: 'test',
  name: 'test',
  role: 'USER',
  phoneNumber: '01557263157',
}));

const location = {
  latitude: '31.014',
  longitude: '30.20357',
  governorate: 'Cairo',
};

async function createUsersAndSetLocation() {
  for (const user of users) {
    try {
      // Register user
      try 
      {
          const res = await axios.post(`${USERS_SERVICE_URL}/signup`, user);
          const userId = res.data.id || res.data.user?.id;
          console.log(`Created user: ${user.email}`);
      }
      catch (err) 
      {
        // If user already exists, ignore error
      }
      // Login to get token
      const loginRes = await axios.post(`${USERS_SERVICE_URL}/login`, {
        email: user.email,
        password: user.password,
      });
      const token = loginRes.data.accessToken || loginRes.data.token;
      if (!token) throw new Error('No token received');

      // Update location
      await axios.post(
        LOCATION_SERVICE_URL,
        location,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`Updated location for: ${user.email}`);
    } catch (err) {
      console.error(`Error for user ${user.email}:`, err.response?.data || err.message);
    }
  }
}

createUsersAndSetLocation();
