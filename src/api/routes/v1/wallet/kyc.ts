import { store, walletKYC } from "../../../controllers/kycController";
import { Router } from "express";
import { adKycValidators } from "../../../validators/kyc";
import { protect } from "../../../middlewares/v1/auth";

const kycRouter = Router();
kycRouter.get("/", protect(false), walletKYC);
kycRouter.post("/", protect(true), adKycValidators, store);

export default kycRouter;
