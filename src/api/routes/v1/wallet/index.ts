import { Router } from "express";
import transactionRouter from "./transactions";
import walletRouter from "./wallet";
import accountRouter from "./account";
import supportedCurrenciesRouter from "./supportedCurrencies";
import devicesRouter from "./devices";
import notification from "./notifications";
import withdrawMethodRouter from "./withdrawMethod";
import kycRouter from "./kyc";
import paymentRequestRouter from "./paymentRequest";
const router = Router();

router.use("/device", devicesRouter);
router.use("/accounts", accountRouter);
router.use("/transactions", transactionRouter);
router.use("/supported-currencies", supportedCurrenciesRouter);
router.use("/notification", notification);
router.use("/withdraw-method", withdrawMethodRouter);
router.use("/", walletRouter);
router.use("/kyc", kycRouter);
router.use("/paymentRequest", paymentRequestRouter);

export default router;
