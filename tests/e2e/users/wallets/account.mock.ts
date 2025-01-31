import { faker } from "@faker-js/faker";

export const importAccount = {
  scretKey: faker.random.alphaNumeric(12),
  recoveryPhase: faker.random.word(),
};
