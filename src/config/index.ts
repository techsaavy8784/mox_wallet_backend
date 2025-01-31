import * as dotenv from "dotenv";

dotenv.config();

export const environment = process.env.NODE_ENV;
export const port = process.env.PORT;
export const onMaintenance = process.env.ON_MAINTENANCE;
export const databaseUrl =
  environment == "test" ? process.env.DATABASE_URL : process.env.DATABASE_URL;
export const signature = process.env.SIGNATURE;
export const appKey = process.env.APP_KEY;
export const baseUrl = process.env.BASE_URL;
export const logDir = process.env.LOG_DIR;
export const emailUser = process.env.EMAIL_USER;
export const emailpass = process.env.EMAIL_PASS;
export const emailhost = process.env.EMAIL_HOST;
export const emailfrom = process.env.EMAIL_FROM;
export const testRippleNetwork = process.env.TEST_RIPPLE_NETWORK as string;
export const mainRippleNetwork = process.env.MAIN_RIPPLE_NETWORK as string;
export const rippleNetwork =
  environment === "production" ? mainRippleNetwork : testRippleNetwork;
export const CURRENCY_CONVERSION_FEE_RATE = 1 / 100;
export const issuerAddress = process.env.ISSUER_ADDRESS;
