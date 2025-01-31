import supertest from "supertest";
import Devices from "../../../src/api/database/models/devices.model";
import Wallet from "../../../src/api/database/models/wallet.model";
import WalletDevices from "../../../src/api/database/models/WalletDevice.model";
import app from "../../../src/app";
import { signupData } from "../__mocks";
const apiVersion = "/v1";

describe("GET /wallets/device/check/:deviceId", () => {
  let authHeader: { Authorization: string };
  let validDeviceId: string;
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});

    const response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    validDeviceId = response.body.data.device._id;
    authHeader = {
      Authorization: `Bearer ${response.body.data.token}`,
    };
  });

  //Need: refactoring
  it("return 200 if the device is not found", async () => {
    const response = await supertest(app)
      .get(`${apiVersion}/wallets/device/check/random-device-id`)
      .set(authHeader);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Device successfully checked");
    expect(response.body.statusCode).toBe("10000");
    expect(response.body.data.found).toBe(false);
  });
  it("return 200 if the device exists", async () => {
    const response = await supertest(app)
      .get(`${apiVersion}/wallets/device/check/${signupData.deviceId}`)
      .set(authHeader);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Device successfully checked");
    expect(response.body.statusCode).toBe("10000");
    expect(response.body.data.found).toBe(true);
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
});

describe("GET /wallets/device/check/all", () => {
  let authHeader: { Authorization: string };
  let validDeviceId: string;
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});

    const response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    validDeviceId = response.body.data.device._id;
    authHeader = {
      Authorization: `Bearer ${response.body.data.token}`,
    };
  });

  it("return 401 if wallet is not logged in", async () => {
    const response = await supertest(app).get(`${apiVersion}/wallets/device/`);
    expect(response.status).toBe(401);
  });
  it("return 200 if the wallet is logged in", async () => {
    const response = await supertest(app)
      .get(`${apiVersion}/wallets/device/all`)
      .set(authHeader);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Devices successfully fetched");
    expect(response.body.data).toHaveProperty("length");
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
});
describe("GET /wallets/device/:deviceId", () => {
  let authHeader: { Authorization: string };
  let validDeviceId: string;
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});

    const response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    validDeviceId = response.body.data.device._id;
    authHeader = {
      Authorization: `Bearer ${response.body.data.token}`,
    };
  });

  it("return 401 if wallet is not logged in", async () => {
    const response = await supertest(app).get(`${apiVersion}/wallets/device/`);
    expect(response.status).toBe(401);
  });
  it("return 200 if the wallet is logged in", async () => {
    const response = await supertest(app)
      .get(`${apiVersion}/wallets/device/single/${validDeviceId}`)
      .set(authHeader);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("device successfully fetched");
  });

  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
});
describe("PATCH /wallets/device/status/:deviceId", () => {
  let authHeader: { Authorization: string };
  let validDeviceId: string;
  let secondDeviceId: string;
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});

    let response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    validDeviceId = response.body.data.device._id;

    authHeader = {
      Authorization: `Bearer ${response.body.data.token}`,
    };
    let secondWalletSignupData = {
      ...signupData,
      deviceId: signupData.deviceId + "x",
    };
    response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(secondWalletSignupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    secondDeviceId = response.body.data.device._id;
  });

  it("return 401 if wallet is not logged in", async () => {
    const response = await supertest(app)
      .patch(`${apiVersion}/wallets/device/status/${validDeviceId}`)
      .send({ status: false });
    expect(response.status).toBe(401);
  });
  it("return 200 and status if the wallet is logged in", async () => {
    // need the investigation
    const response = await supertest(app)
      .patch(`${apiVersion}/wallets/device/status/${validDeviceId}`)
      .set(authHeader)
      .send({ status: false });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("device successfully deleted");
  });
  it("return 404 and status if the device is not associated with the uer", async () => {
    // need the investigation
    const response = await supertest(app)
      .patch(`${apiVersion}/wallets/device/status/${secondDeviceId}`)
      .set(authHeader)
      .send({ status: false });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      "There is no such device for this wallet"
    );
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
});

describe("DELETE  /wallets/device/:deviceId", () => {
  let authHeader: { Authorization: string };
  let validDeviceId: string;
  let secondDeviceId: string;
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});

    let response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    validDeviceId = response.body.data.device._id;

    authHeader = {
      Authorization: `Bearer ${response.body.data.token}`,
    };
    let secondWalletSignupData = {
      ...signupData,
      deviceId: signupData.deviceId + "x",
    };
    response = await supertest(app)
      .post(`${apiVersion}/wallets`)
      .send(secondWalletSignupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    secondDeviceId = response.body.data.device._id;
  });

  it("return 401 if wallet is not logged in", async () => {
    const response = await supertest(app).delete(
      `${apiVersion}/wallets/device/${validDeviceId}`
    );
    expect(response.status).toBe(401);
  });
  it("return 200 and status if the wallet is logged in", async () => {
    // need the investigation
    const response = await supertest(app)
      .delete(`${apiVersion}/wallets/device/${validDeviceId}`)
      .set(authHeader);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("device successfully deleted");
  });
  it("return 404 and status if the device doesn't belong to the wallet", async () => {
    // need the investigation
    const response = await supertest(app)
      .delete(`${apiVersion}/wallets/device/${secondDeviceId}`)
      .set(authHeader);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      "There is no such device for this wallet"
    );
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
});
