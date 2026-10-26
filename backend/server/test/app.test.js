const path = require('path');
const pathToApp = path.join(__dirname, '../src/app.js');
const request = require('supertest');
const app = require(pathToApp);

describe('User API Suite', () => {
  
  // This is a single Test
  it('should return a 200 status and a proper message', async () => {
    const response = await request(app).get('/');
    
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Backend is running properly!');
  });

});
