import { onlyForRoles, protect } from "../../../../api/middlewares/v1/auth";
import { changeStatus, index, show } from "../../../controllers/kycController";
import { Router } from "express";
import { WalletRole } from "../../../../api/database/models/wallet.model";
import { kycStatusValidator } from "../../../../api/validators/kyc";

const kycRouter = Router();
kycRouter.get(
  "/",
  protect(true),
  onlyForRoles([WalletRole.SUPER_ADMIN]),
  index
);
kycRouter.get(
  "/:kycId",
  protect(true),
  onlyForRoles([WalletRole.SUPER_ADMIN]),
  show
);
kycRouter
  .route("/approve/:kycId")
  .patch(
    protect(true),
    onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
    kycStatusValidator,
    changeStatus
  );

export default kycRouter;
