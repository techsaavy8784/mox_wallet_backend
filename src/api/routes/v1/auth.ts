import { Router } from "express";
import { protect } from "../../middlewares/v1/auth";
import { getLoggedInWallet, login } from "../../../api/controllers/auth";
import { loginValidator } from "../../../api/validators/auth";

const authRouter = Router();

authRouter.post("/login", loginValidator, login);
authRouter.get("/me", protect(true), getLoggedInWallet);

export default authRouter;
