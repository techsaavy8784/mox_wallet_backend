import {
  updateRole,
  index,
  getAdmins,
  saveCard,
  banAccount,
} from "../../../controllers/wallet";
import { Router } from "express";
import { onlyForRoles, protect } from "../../../middlewares/v1/auth";
import { WalletRole } from "../../../database/models/wallet.model";
import { addCardWithStripeValidator } from "../../../validators/wallet";
import { banAccountValidator } from "../../../validators/account";
import { countInfo } from "../../../../api/controllers/transaction";

const walletRouter = Router();

walletRouter
  .route("/")
  .get(
    protect(true),
    onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
    index
  );

walletRouter.get(
  "/countInfo",
  protect(true),
  onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
  countInfo
);

walletRouter
  .route("/all-admins")
  .get(
    protect(true),
    onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
    getAdmins
  );
walletRouter.patch(
  "/:walletId/update-role",
  protect(true),
  onlyForRoles([WalletRole.SUPER_ADMIN]),
  updateRole
);

walletRouter.post(
  "/cards/add-card-stripe",
  protect(true),
  addCardWithStripeValidator,
  onlyForRoles([WalletRole.SUPER_ADMIN]),
  saveCard
);

walletRouter
  .route("/ban")
  .patch(
    protect(true),
    onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
    banAccountValidator,
    banAccount
  );

export default walletRouter;
