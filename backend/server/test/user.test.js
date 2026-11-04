const path = require('path');
const pathToApp = path.join(__dirname, '../src/app.js');
const request = require('supertest');
const app = require(pathToApp);
// const db = require('../src/db/db');


describe("User Authentication Suite", () => {
    it("should return a 401 for unauthorized access", async () => {
        const studentRes = await request(app)
            .post("/api/vi/users/login")
            .send({ email: "halima.yusuf@student.school.edu.ng", password: "Password123!" });
        const studentToken = `Bearer ${studentRes.body.data.accessToken}`;
        const teacherRes = await request(app)
            .post("/api/vi/users/login")
            .send({ email: "gigi.onyegbula.2007@gmail.com", password: "iamnotgay" });
        const teacherToken = `Bearer ${teacherRes.body.data.accessToken}`;

        expect(response.statusCode).toBe(200);
    });
});
