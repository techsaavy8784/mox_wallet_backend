import supertest from "supertest";

import Devices from "../../../../src/api/database/models/devices.model";
import Wallet from "../../../../src/api/database/models/wallet.model";
import WalletDevices from "../../../../src/api/database/models/WalletDevice.model";
import app from "../../../../src/app";

import { importAccount } from "./account.mock";
import { signupData } from "../../__mocks";
import Account, {
  AccountDocument,
} from "../../../../src/api/database/models/account.model";

const apiVersion = "/v1";
// Done
describe("POST /wallets/accounts", () => {
  let authHeader: { Authorization: string };
  let validDeviceId: string;
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
    await Account.deleteMany({});

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

  it("return 401 if  wallet is not logged in", async () => {
    const response = await supertest(app).post(
      `${apiVersion}/wallets/accounts`
    );
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Token is missing");
  });
  it("return  200 if the account is created", async () => {
    const response = await supertest(app)
      .post(`${apiVersion}/wallets/accounts`)
      .set(authHeader);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Account account recovery successfully generated"
    );
    expect(response.body.statusCode).toBe("10000");
    expect(response.body.data.account).toBeDefined();
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
    await Account.deleteMany({});
  });
});
//Import account
describe("POST /wallets/accounts/import", () => {
  let authHeader: { Authorization: string };
  let validDeviceId: string;
  let account: AccountDocument | null;
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
    await Account.deleteMany({});

    let response = await supertest(app)
      .post(`${apiVersion}/wallets/`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    validDeviceId = response.body.data.device._id;
    authHeader = {
      Authorization: `Bearer ${response.body.data.token}`,
    };

    response = await supertest(app)
      .post(`${apiVersion}/wallets/accounts`)
      .set(authHeader);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Account account recovery successfully generated"
    );
    expect(response.body.statusCode).toBe("10000");
    expect(response.body.data.account).toBeDefined();
    account = response.body.data.account;
  });

  it("return 400 and validation error if the secretKey or scretPharse is not provided", async () => {
    const response = await supertest(app).post(
      `${apiVersion}/wallets/accounts/import`
    );
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Token is missing");
    expect(response.body.statusCode).toBe("10001");
  });
  it("return  200 if scretPhase and secretKey are provided", async () => {
    const response = await supertest(app)
      .post(`${apiVersion}/wallets/accounts/import`)
      .send(importAccount);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Account account recovery successfully generated"
    );
    expect(response.body.statusCode).toBe("10000");
    expect(response.body.data.account).toBeDefined();
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
    await Account.deleteMany({});
  });
});
describe("GET /wallets/accounts/:accountId", () => {
  let authHeader: { Authorization: string };
  let validDeviceId: string;
  beforeAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});

    const response = await supertest(app)
      .post(`${apiVersion}/wallets/accounts/import`)
      .send(signupData);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Wallet Registered Successfully");
    validDeviceId = response.body.data.device._id;
    authHeader = {
      Authorization: `Bearer ${response.body.data.token}`,
    };
  });

  //Need: refactoring
  it("return 401 if  wallet is not logged in", async () => {
    const response = await supertest(app).post(
      `${apiVersion}/wallets/accounts`
    );
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Token is missing");
  });
  it("return 400 and validation error if the secretKey or scretPharse is not provided", async () => {
    const response = await supertest(app).post(
      `${apiVersion}/wallets/accounts`
    );
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Token is missing");
    expect(response.body.statusCode).toBe("10001");
  });
  it("return  200 if scretPhase and secretKey are provided", async () => {
    const response = await supertest(app)
      .post(`${apiVersion}/wallets/accounts`)
      .set(authHeader)
      .send(importAccount);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Account account recovery successfully generated"
    );
    expect(response.body.statusCode).toBe("10000");
    expect(response.body.data.account).toBeDefined();
  });
  afterAll(async () => {
    await Devices.deleteMany({});
    await WalletDevices.deleteMany({});
    await Wallet.deleteMany({});
  });
});
