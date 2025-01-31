import { Router } from "express";
import transactionRouter from "./transactions";
import walletRouter from "./wallet";
import accountRouter from "./account";
import supportedCurrenciesRouter from "./supportedCurrencies";
import devicesRouter from "./devices";
import kycRouter from "./kyc";
const router = Router();

router.use("/", walletRouter);
router.use("/device", devicesRouter);
router.use("/accounts", accountRouter);
router.use("/transactions", transactionRouter);
router.use("/supported-currencies", supportedCurrenciesRouter);
router.use("/kyc", kycRouter);

export default router;
