import { faker } from "@faker-js/faker";
export const signupData = {
  deviceName: faker.internet.userAgent.name,
  osName: faker.system.fileName(),
  osVersion: faker.system.semver(),
  deviceId: faker.phone.imei(),
  password: faker.internet.password(),
};
export const maliciousSignupData = {
  deviceName: faker.internet.userAgent.name,
  osName: faker.system.fileName(),
  osVersion: faker.system.semver(),
  deviceId: faker.phone.imei(),
  password: faker.internet.password(),
  role: "admin",
};
