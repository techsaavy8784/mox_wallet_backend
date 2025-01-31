import {
  index,
  store,
  show,
  destroy,
  addName,
  createPassword,
  generateAddress,
  validateSecretPhrase,
  importAccount,
  addBeneficiary,
  updateBeneficiary,
  allBeneficiaries,
} from "../../../controllers/account";
import { Router } from "express";
import { createWalletValidator } from "../../../validators/wallet";
import { protect } from "../../../middlewares/v1/auth";
import {
  addNameValidator,
  importValidator,
  secretPhraseValidator,
  addBeneficiaryValidator,
} from "../../../validators/account";
import { getTransactionsForSingleAccount } from "../../../controllers/transaction";
import { walletBalances } from "../../../controllers/wallet";

const accountRouter = Router();

accountRouter.route("/").post(protect(false), store);

accountRouter.post("/import", protect(false), importValidator, importAccount);

accountRouter
  .route("/:accountId")
  .get(protect(false), show)
  .delete(protect(false), destroy);

accountRouter.post(
  "/:accountId/validate-secret-phrase",
  secretPhraseValidator,
  validateSecretPhrase
);

accountRouter.put(
  "/:accountId/create-password",
  protect(false),
  createWalletValidator,
  createPassword
);

accountRouter.put(
  "/:accountId/generate-address",
  protect(false),
  generateAddress
);

accountRouter.put(
  "/:accountId/add-name",
  protect(false),
  addNameValidator,
  addName
);

accountRouter.get(
  "/:accountId/transactions",
  protect(false),
  getTransactionsForSingleAccount
);

accountRouter.get("/:accountId/balances", protect(false), walletBalances);

export default accountRouter;
