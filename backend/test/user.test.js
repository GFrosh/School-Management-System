const path = require('path');
const pathToApp = path.join(__dirname, '../src/app');
const request = require('supertest');
const app = require(pathToApp);
const db = require('../src/db/db');

afterAll(async () => {
    await db.destroy();
});


describe("User Authentication Suite", () => {
    // Simulate user login for pass to reset failed attempts and for fail to receive 401
    const email = "samuel.okafor@student.school.edu.ng";
    const password = "Password123!";
    const loginRoute = "/api/v1/users/login";
    it("should return a 200 for a successful login", async () => {
        const res = await request(app)
            .post(loginRoute)
            .send({ email, password});
        
        expect(res.statusCode).toBe(200);
    });
    it("should return a 401 for unauthorized access", async () => {
        const res = await request(app)
            .post(loginRoute)
            .send({ email, password: "wrong-password-for-failure" });
        
        expect(res.statusCode).toBe(401);
    });
    it("should return a 401 for unauthorized access with invalid email", async () => {
        const res = await request(app)
            .post(loginRoute)
            .send({ email: "invalid@example.com", password: "any-password" });
        expect(res.statusCode).toBe(401);
    });
    it("should return a 401 for unauthorized access to a protected route without a token", async () => {
        const res = await request(app)
            .get("/api/v1/users/me");
        expect(res.statusCode).toBe(401);
    });
});


describe("User Authorization Suite", () => {
    let accessToken;
    beforeAll(async () => {
        const email = "samuel.okafor@student.school.edu.ng";
        const password = "Password123!";
        const loginRoute = "/api/v1/users/login";
        const res = await request(app)
            .post(loginRoute)
            .send({ email, password });
        accessToken = res.body.data.accessToken;
    });

    it("should return a 200 for authorized access to a protected route with a valid token", async () => {
        const res = await request(app)
            .get("/api/v1/users/me")
            .set("Authorization", `Bearer ${accessToken}`);
        expect(res.statusCode).toBe(200);
    });
    it("should return a 401 for unauthorized access to a protected route with an invalid token", async () => {
        const res = await request(app)
            .get("/api/v1/users/me")
            .set("Authorization", "Bearer invalid-token");
        expect(res.statusCode).toBe(401);
    });
    it("should return a 401 for unauthorized access to a protected route with an expired token", async () => {
        // This test would require a way to generate an expired token
        // For now, we'll just assert that the status code is 401
        const res = await request(app)
            .get("/api/v1/users/me")
            .set("Authorization", "Bearer expired-token");
        expect(res.statusCode).toBe(401);
    });
    it("should return a 403 for forbidden access to a protected route with insufficient permissions", async () => {
        const res = await request(app)
            .get("/api/v1/students")
            .set("Authorization", `Bearer ${accessToken}`);
        expect(res.statusCode).toBe(403);
    });
});


