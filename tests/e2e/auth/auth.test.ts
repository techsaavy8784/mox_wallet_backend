import supertest from "supertest";
import Devices from "../../../src/api/database/models/devices.model";
import Wallet from "../../../src/api/database/models/wallet.model";
import WalletDevices from "../../../src/api/database/models/WalletDevice.model";
import app from "../../../src/app";
import { signupData, maliciousSignupData } from "./auth.mock";
const apiVersion = "/v1";
// Endpoint for the signup
describe("POST /wallets", () => {
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
  it("should return 400 that if no information is provided", async () => {
    const response = await supertest(app).post(`${apiVersion}/wallets`);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Device ID must be a string, Device ID cannot be empty, Password must be a string, Password field cannot be empty, deviceName must be a string, deviceName field cannot be empty, osName must be a string, osName field cannot be empty, osVersion must be a string, osVersion field cannot be empty, deviceId must be a string, deviceId field cannot be empty"
    );
  });
  it("should return 200 if the valid data are provided", async () => {
    const response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
  });
  it("should login wallet  if the data already exists", async () => {
    await supertest(app).post(`${apiVersion}/wallets`).send(signupData);

    const response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet loggedin successfully");
    expect(response.body.toke);
  });
  it("should should strip out data that which not required", async () => {
    const response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(maliciousSignupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    const device = await Devices.findOne({
      deviceId: maliciousSignupData.deviceId,
    });
    const walletDevice = await WalletDevices.findOne({
      deviceId: device?.id,
    });
    const wallet = await Wallet.findOne({
      id: walletDevice?.walletId,
    });
    expect(wallet).not.toBeNull();
    expect(wallet?.role).not.toBe(maliciousSignupData.role);
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
});

describe("POST /auth/login", () => {
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});

    const response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
  });
  it("should return 401 Unathorized if the provided password is wrong", async () => {
    const response = await supertest(app)
      .post(`${apiVersion}/auth/login`)
      .send({
        deviceId: signupData.deviceId,
        password: "random password",
      });
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid Password");
    expect(response.body.statusCode).toBe("10001");
  });
  it("should return 404 Not found if the provided device id is not found", async () => {
    const response = await supertest(app)
      .post(`${apiVersion}/auth/login`)
      .send({
        deviceId: "Invalid device id",
        password: signupData.password,
      });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Device id isn't registered");
    expect(response.body.statusCode).toBe("10001");
  });
  it("should return 200 Authorized if the provided password is correct", async () => {
    const response = await supertest(app)
      .post(`${apiVersion}/auth/login`)
      .send({
        deviceId: signupData.deviceId,
        password: signupData.password,
      });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet loggedin successfully");
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
});

// Endpoint for getting the wallet
describe("POST /auth/me", () => {
  let token: string | null;
  let headers: { validTokenHeaders: object; invalidTokenHeaders: object };
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});

    const response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    token = response.body.data.token;
    headers = {
      validTokenHeaders: {
        Authorization: `Bearer ${token}`,
      },
      invalidTokenHeaders: {
        Authorization: "Bearer test",
      },
    };
  });
  it("should return 401 Unathorized if no toekn is provided", async () => {
    const response = await supertest(app).get(`${apiVersion}/auth/me`);
    expect(response.status).toBe(401);
    expect(response.body.statusCode).toBe("10001");
    expect(response.body.message).toBe("Token is missing");
  });
  it("should return 401 Unathorized if no toekn is provided", async () => {
    const response = await supertest(app)
      .get(`${apiVersion}/auth/me`)
      .set(headers.invalidTokenHeaders);
    expect(response.status).toBe(401);
    expect(response.body.statusCode).toBe("10001");
    expect(response.body.message).toBe("Token is invalid");
  });
  it("should return 200 and wallet data if the token is provided", async () => {
    const response = await supertest(app)
      .get(`${apiVersion}/auth/me`)
      .set(headers?.validTokenHeaders);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet retrieved successfully");
    expect(response.body.statusCode).toBe("10000");
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
});
