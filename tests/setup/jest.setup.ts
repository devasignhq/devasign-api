// Load test environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.test') });

// Set test timeout
jest.setTimeout(30000);