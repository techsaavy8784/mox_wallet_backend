import {
  store,
  walletReceivedPaymentRequest,
  walletSentPaymentRequest,
  changeStatus,
} from "../../../controllers/paymentRequest";
import { Router } from "express";
import {
  requestValidator,
  statusValidator,
} from "../../../validators/paymentRequest";
import { protect } from "../../../middlewares/v1/auth";

const paymentRequestRouter = Router();
paymentRequestRouter.get(
  "/received",
  protect(false),
  walletReceivedPaymentRequest
);
paymentRequestRouter.get("/sent", protect(false), walletSentPaymentRequest);
paymentRequestRouter.patch(
  "/:paymentRequestId",
  protect(true),
  statusValidator,
  changeStatus
);
paymentRequestRouter.post("/", protect(true), requestValidator, store);

export default paymentRequestRouter;
