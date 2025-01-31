import { WalletRole } from "../../../../api/database/models/wallet.model";
import { Router } from "express";
import { analytics, index } from "../../../controllers/transaction";
import { onlyForRoles, protect } from "../../../middlewares/v1/auth";
import {
  changeOTPStatus,
  confirgOTPDisable,
} from "../../../controllers/wallet";
import {
  changeOTPSTatusValidator,
  confirmOTPSTatusValidator,
} from "../../../../api/validators/wallet";

const transactionRouter = Router();

transactionRouter.get(
  "/",
  protect(true),
  onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
  index
);

transactionRouter.get(
  "/analytics",
  protect(true),
  onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
  analytics
);

transactionRouter.post(
  "/paystack/OTPStatus",
  protect(true),
  onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
  changeOTPSTatusValidator,
  changeOTPStatus
);

transactionRouter.post(
  "/paystack/OTPConfirm",
  protect(true),
  onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
  confirmOTPSTatusValidator,
  confirgOTPDisable
);

export default transactionRouter;
