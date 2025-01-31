import { Router } from "express";
import deviceRouter from "./devices";
import accountRouter from "./account";
import walletRouter from "./wallet";
import adminRouter from "./admin";
import authRouter from "./auth";
import supportedCurrencies from "./supportedCurrencies";

const router = Router();

router.use("/auth", authRouter);
router.use("/wallets", walletRouter);
router.use("/admin", adminRouter);
router.use("/device", deviceRouter);
router.use("/account", accountRouter);
router.use("/supported-currencies", supportedCurrencies);

export default router;
