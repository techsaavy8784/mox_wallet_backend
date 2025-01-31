import { index } from "../../../../api/controllers/device";
import { Router } from "express";
import { onlyForRoles, protect } from "../../../../api/middlewares/v1/auth";
import { WalletRole } from "../../../../api/database/models/wallet.model";

const devicesRouter = Router();

devicesRouter.get(
  "/all",
  protect(true),
  onlyForRoles([WalletRole.SUPER_ADMIN]),
  index
);

export default devicesRouter;
