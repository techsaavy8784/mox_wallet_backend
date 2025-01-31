import {
  convert,
  getConversionDetails,
  swappCurrency,
  index,
  // showForWallet,
} from "../../../controllers/supportedCurrencies";
import { Router } from "express";
import { validateSwappCurrency } from "../../../validators/supportedCurrencies";

const supportedCurrenciesRouter = Router();
supportedCurrenciesRouter.get("/", index);
supportedCurrenciesRouter.get("/convert/:currency/:amount", convert);
supportedCurrenciesRouter.post("/swap", validateSwappCurrency, swappCurrency);
supportedCurrenciesRouter.get("/get-swap-fees", getConversionDetails);
// supportedCurrenciesRouter.get("/transactions", showForWallet);

export default supportedCurrenciesRouter;
