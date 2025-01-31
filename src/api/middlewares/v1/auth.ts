import { NextFunction, Request, Response } from "express";
import asyncHandler from "../../../helpers/asyncHandler";
import { AuthFailureResponse } from "../../../core/ApiResponse";
import Wallet, { WalletDocument } from "../../database/models/wallet.model";
import Jwt from "../../../core/Jwt";
import { AccountType } from "../../../api/controllers/wallet";

// Protect routes
export const protect = (kyc: boolean) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Set token from Bearer token in header
      token = req.headers.authorization.split(" ")[1];
      // Set token from cookie
    }
    // else if (req.cookies.token) {
    //   token = req.cookies.token;
    // }
    // Make sure token exists
    if (!token) {
      return new AuthFailureResponse("Token is missing").send(res);
    }

    try {
      // Verify token
      const decoded = await Jwt.verify(token);

      let wallet: WalletDocument | undefined | null = await Wallet.findById(
        decoded.sub
      );

      if (!wallet) {
        return new AuthFailureResponse("Token is invalid").send(res);
      }

      if (wallet.isBanned) {
        return new AuthFailureResponse("Wallet is banned from MOX").send(res);
      }
      if (
        (wallet.accountType == AccountType.CUSTODIAL ||
          (req.body.level !== undefined && req.body.level === "WALLET")) &&
        !wallet.isKycOnboarded &&
        wallet.kycStatus !== "APPROVED" &&
        !kyc
      ) {
        return new AuthFailureResponse(
          "Wallet KYC should be approved first"
        ).send(res);
      }

      req.wallet = wallet;
      next();
    } catch (err) {
      return new AuthFailureResponse("Token is invalid").send(res);
    }
  });

export const onlyForRoles = (roles: string[]) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!roles.some((roleName: string) => roleName == req.wallet?.role))
      return new AuthFailureResponse(
        "Wallet isn't privileged to perform such action"
      ).send(res);
    next();
  });
