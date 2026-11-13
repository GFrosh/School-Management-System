const request = require("supertest");
const app = require("../src/app");

describe("Phase 2 resource authorization", () => {
  test.each([
    ["subjects", "/api/v1/subjects"],
    ["teaching assignments", "/api/v1/teaching-assignments"],
    ["teachers", "/api/v1/teachers"],
    ["student creation", "/api/v1/students"],
    ["promotions", "/api/v1/sessions/00000000-0000-0000-0000-000000000000/promotions"],
  ])("requires authentication for %s", async (_name, route) => {
    const response = await request(app).get(route);
    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});
