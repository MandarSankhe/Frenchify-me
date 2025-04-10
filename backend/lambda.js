const serverless = require('serverless-http');
const app = require('./server');

// Export Lambda handler function
module.exports.handler = serverless(app);
