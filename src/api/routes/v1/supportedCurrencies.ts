import { convert, index } from "../../controllers/supportedCurrencies";
import { Router } from "express";

const supportedCurrenciesRouter = Router();

supportedCurrenciesRouter.get("/convert/:currency/:amount", convert);

supportedCurrenciesRouter.get("/", index);

export default supportedCurrenciesRouter;
