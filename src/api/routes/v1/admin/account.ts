import { banAccount, index, showAdmin } from "../../../controllers/account";
import { Router } from "express";
import { onlyForRoles, protect } from "../../../middlewares/v1/auth";
import { WalletRole } from "../../../database/models/wallet.model";
import { banAccountValidator } from "../../../validators/account";

const accountRouter = Router();

accountRouter
  .route("/")
  .get(
    protect(true),
    onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
    index
  );

accountRouter
  .route("/:accountId")
  .get(
    protect(true),
    onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
    showAdmin
  );

accountRouter
  .route("/ban")
  .patch(
    protect(true),
    onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
    banAccountValidator,
    banAccount
  );

export default accountRouter;
