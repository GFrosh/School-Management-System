const path = require('path');
const pathToApp = path.join(__dirname, '../src/app.js');
const request = require('supertest');
const app = require(pathToApp);
const db = require('../src/db/db');

describe('Server Health Suite', () => {
  
  // This is a single Test
  it('should return a 200 status and a proper message', async () => {
    const response = await request(app).get('/');
    
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Backend is running properly!');
  });

});

describe("User API Suite", () => {
  it("should return a list of users", async () => {
    const response = await request(app).get("/api/v1/users");
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
afterAll(async () => {
  await db.destroy();
});
