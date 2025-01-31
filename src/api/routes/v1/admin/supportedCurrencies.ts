import {
  index,
  store,
  destroy,
  show,
  update,
  convert,
} from "../../../controllers/supportedCurrencies";
import { Router } from "express";
import { onlyForRoles, protect } from "../../../middlewares/v1/auth";
import { supportedCurrenciesValidator } from "../../../validators/supportedCurrencies";
import { WalletRole } from "../../../database/models/wallet.model";
import { multerUploads } from "../../../../lib/multer";

const supportedCurrenciesRouter = Router();

supportedCurrenciesRouter
  .route("/")
  .get(protect(true), index)
  .post(
    protect(true),
    onlyForRoles([WalletRole.SUPER_ADMIN]),
    multerUploads.single("image"),
    supportedCurrenciesValidator,
    store
  );

supportedCurrenciesRouter
  .route("/:id")
  .get(
    protect(true),
    onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
    show
  )
  .delete(
    protect(true),
    onlyForRoles([WalletRole.ADMIN, WalletRole.SUPER_ADMIN]),
    destroy
  );

supportedCurrenciesRouter.patch(
  "/:id/update",
  protect(true),
  onlyForRoles([WalletRole.SUPER_ADMIN]),
  multerUploads.single("image"),
  update
);

export default supportedCurrenciesRouter;
