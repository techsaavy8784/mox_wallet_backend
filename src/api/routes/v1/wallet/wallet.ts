import {
  index,
  store,
  show,
  changePassword,
  destroy,
  getAddressTokenRequests,
  getAccountByAddress,
  walletNFTs,
  updateProfile,
  validateSecretPhrase,
  importAccount,
  buytokenWithStripe,
  stripeWebhookForBuytoken,
  createSellerAccountForStripe,
  trasferFundWithStripe,
  buytokenWithPaystackCard,
  getWalletCards,
  deleteCard,
  verifyTransaction,
  paystackWebhookForBuytoken,
  addPaystackCard,
  onboardPaystackSeller,
  trasferFundWithPaystack,
  initializeAdmin,
  vaultBalances,
  topUpAT,
  getTransactions,
  getByEmail,
} from "../../../controllers/wallet";
import { Router } from "express";
import { protect } from "../../../middlewares/v1/auth";
import {
  createWalletValidator,
  updateWalletValidator,
  secretPhraseValidator,
  importValidator,
  buyTokenValidator,
  onboardSellerWithStripeValidator,
  transferFundWithStripeValidator,
  buyPaystackTokenValidator,
  addPaystackCardValidator,
  onboardSellerPaystackValidator,
  transferFundWithPaystackValidator,
  topUpAfricastalkingValidator,
} from "../../../validators/wallet";
import { getAllNotificationsForSingleWallet } from "../../../controllers/notifications";
import {
  addBeneficiary,
  allBeneficiaries,
  getWalletAccounts,
  updateBeneficiary,
  deleteBeneficiary,
} from "../../../controllers/account";
import { multerUploads } from "../../../../lib/multer";
import { addBeneficiaryValidator } from "../../../validators/account";

const walletRouter = Router();

walletRouter
  .route("/beneficiaries")
  .get(protect(false), allBeneficiaries)
  .post(protect(false), addBeneficiaryValidator, addBeneficiary);

walletRouter
  .route("/beneficiaries/:beneficiaryId")
  .put(protect(false), addBeneficiaryValidator, updateBeneficiary)
  .delete(protect(false), deleteBeneficiary);

walletRouter.get("/NFTokens/:xrpAddress", walletNFTs);

walletRouter.get("/NFTokenRequest/:xrpAddress", getAddressTokenRequests);

walletRouter.get("/account/:xrpAddress", getAccountByAddress);

walletRouter.route("/").post(createWalletValidator, store);

walletRouter.route("/initialize").post(createWalletValidator, initializeAdmin);

walletRouter.get("/transactions", protect(false), getTransactions);

walletRouter
  .route("/:walletId")
  .get(protect(true), show)

  .delete(protect(true), destroy);

walletRouter.route("/email/:email").get(protect(true), getByEmail);

walletRouter.get(
  "/:walletId/notifications",
  protect(false),
  getAllNotificationsForSingleWallet
);

walletRouter.patch("/change-password", updateWalletValidator, changePassword);

walletRouter.post(
  "/:walletId/validate-secret-phrase",
  secretPhraseValidator,
  validateSecretPhrase
);

walletRouter.get("/vault/balances", protect(false), vaultBalances);

walletRouter.post("/import", importValidator, importAccount);

walletRouter.get("/:walletId/accounts", protect(false), getWalletAccounts);

walletRouter.patch(
  "/:walletId/update-profile",
  protect(false),
  multerUploads.single("profile-image"),
  updateProfile
);

walletRouter.post(
  "/buy-tokens-stripe",
  protect(false),
  buyTokenValidator,
  buytokenWithStripe
);

walletRouter.post(
  "/buy-tokens-paystack-card",
  protect(false),
  buyPaystackTokenValidator,
  buytokenWithPaystackCard
);

walletRouter.post(
  "/add-paystack-card",
  protect(false),
  addPaystackCardValidator,
  addPaystackCard
);

walletRouter.get(
  "/verify-paystack-transaction/:reference",
  protect(false),
  verifyTransaction
);

walletRouter.post("/stripe-webhook", stripeWebhookForBuytoken);

walletRouter.post("/paystack-webhook", paystackWebhookForBuytoken);

walletRouter.post(
  "/onboard-seller-stripe",
  protect(false),
  onboardSellerWithStripeValidator,
  createSellerAccountForStripe
);

walletRouter.post(
  "/onboard-seller-paystack",
  protect(false),
  onboardSellerPaystackValidator,
  onboardPaystackSeller
);

walletRouter.post(
  "/transer-fund-stripe",
  protect(false),
  transferFundWithStripeValidator,
  trasferFundWithStripe
);

walletRouter.post(
  "/transer-fund-paystack",
  protect(false),
  transferFundWithPaystackValidator,
  trasferFundWithPaystack
);

walletRouter.get("/:walletId/cards", protect(false), getWalletCards);

walletRouter.delete("/cards/:cardId", protect(false), deleteCard);

walletRouter.post(
  "/top-up",
  protect(false),
  topUpAfricastalkingValidator,
  topUpAT
);
export default walletRouter;
