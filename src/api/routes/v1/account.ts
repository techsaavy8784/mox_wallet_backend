import { validateSecretPhrase } from "../../controllers/account";
import { Router } from "express";
import { secretPhraseValidator } from "../../validators/account";

const accountRouter = Router();

accountRouter.post(
  "/:accountId/validate-secret-phrase",
  secretPhraseValidator,
  validateSecretPhrase
);
export default accountRouter;
