const path = require("path");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require(path.join(__dirname, "../src/app"));
const config = require("../src/config");
const db = require("../src/db/db");

const studentsRoute = "/api/v1/students";
const teacherCredentials = {
  email: "n.eze@school.edu.ng",
  password: "Password123!",
};

async function login(credentials) {
  const response = await request(app)
    .post("/api/v1/users/login")
    .send(credentials);

  expect(response.statusCode).toBe(200);
  return response.body.data.accessToken;
}

describe("GET /api/v1/students role authorization", () => {
  afterAll(async () => {
    await db.destroy();
  });

  it("allows an admin to list students", async () => {
    const token = await login({
      email: config.adminEmail,
      password: config.adminPassword,
    });

    const response = await request(app)
      .get(studentsRoute)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
      }),
    );
  });

  it("allows a teacher to list students", async () => {
    const token = await login(teacherCredentials);

    const response = await request(app)
      .get(studentsRoute)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
      }),
    );
  });

  it("denies a user without an allowed role", async () => {
    const token = jwt.sign(
      { sub: "role-check-user", roles: ["student"] },
      config.jwt.accessSecret,
      { expiresIn: "5m" },
    );

    const response = await request(app)
      .get(studentsRoute)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: "FORBIDDEN",
      }),
    );
  });

  it("denies requests without an access token", async () => {
    const response = await request(app).get(studentsRoute);

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: "UNAUTHENTICATED",
      }),
    );
  });
});
