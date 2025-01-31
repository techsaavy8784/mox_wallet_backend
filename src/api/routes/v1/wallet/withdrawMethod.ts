import { protect } from "../../../middlewares/v1/auth";
import { Router } from "express";

import {
  addWithdrawMethod,
  removeWithdrawMethod,
  getWalletWithdrawMethod,
  getSingleWithrawMethod,
} from "../../../controllers/PayoutController";
import {
  addWithdrawMethodValidators,
  filterOptionsValidator,
  ParamIdValidator,
} from "../../../validators/withdrawMethod";
import validate from "../../../validators";

const withdrawMethodRouter = Router();
withdrawMethodRouter.get(
  "/:gateway",
  protect(false),
  filterOptionsValidator,
  getWalletWithdrawMethod
);
withdrawMethodRouter.post(
  "/",
  addWithdrawMethodValidators,
  protect(false),
  addWithdrawMethod
);
withdrawMethodRouter.delete(
  "/:id",
  protect(false),
  ParamIdValidator,
  removeWithdrawMethod
);
withdrawMethodRouter.get(
  "/:id",
  protect(false),
  ParamIdValidator,
  getSingleWithrawMethod
);
export default withdrawMethodRouter;
