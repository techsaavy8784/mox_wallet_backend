import request from "supertest";
import app from "../../src/app";
describe("BASE Api /", () => {
  it("should return the object", async () => {
    const response = await request(app).get("/");
    expect(response.body).toHaveProperty("message");
    expect(response.body.environment).toBe("test");
    expect(response.body.message).toBe(`Welcome to Montech XRP Wallet Server`);
  });
});
// write the test
