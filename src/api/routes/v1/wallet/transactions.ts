import { WalletRole } from "../../../database/models/wallet.model";
import { Router } from "express";
import {
  approveNFToken,
  destroy,
  show,
  transfer,
  transferNFToken,
  getFees,
} from "../../../controllers/transaction";
import { protect } from "../../../middlewares/v1/auth";
import {
  approveValidator,
  transferValidator,
  transferNFTValidator,
} from "../../../validators/transaction";

const transactionRouter = Router();
transactionRouter.get("/fees", protect(false), getFees);

transactionRouter.post(
  "/transfer",
  transferValidator,
  protect(false),
  transfer
);

transactionRouter.patch(
  "/NFTokenApprove",
  approveValidator,
  protect(false),
  approveNFToken
);

transactionRouter.post(
  "/transferNFToken",
  transferNFTValidator,
  protect(false),
  transferNFToken
);

transactionRouter
  .route("/:NFT")
  .get(protect(false), show)
  .delete(protect(false), destroy);

export default transactionRouter;
