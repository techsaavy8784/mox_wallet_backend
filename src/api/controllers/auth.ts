import { Request, Response } from "express";
import asyncHandler from "../../helpers/asyncHandler";
import {
  AuthFailureResponse,
  BadRequestResponse,
  NotFoundResponse,
  SuccessResponse,
} from "../../core/ApiResponse";
import { matchedData, validationResult } from "express-validator";
import WalletService from "../../services/wallet_service";
import Jwt from "../../core/Jwt";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import AccountService from "../../services/account_service";
import Devices from "../../api/database/models/devices.model";
import WalletDevices from "../../api/database/models/WalletDevice.model";
import Wallet from "../../api/database/models/wallet.model";
import Vault from "../../api/database/models/vault.model";
import VaultAsset from "../../api/database/models/vaultAsset.model";

export const login = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { password, email } = matchedData(req, { locations: ["body"] });

  

  
    const existingWallet = await Wallet.findOne({ email }).select("+password")

    if (!existingWallet) {
      return new NotFoundResponse(
        `Account not found`
      ).send(res);
    }
   

    if (!existingWallet) {
      return new AuthFailureResponse("wallet could not be found").send(res);
    }
    const { transformedWallet, device, message } = await WalletService.login(
      existingWallet,
      password
    );

    if (!transformedWallet && !device) {
      return new AuthFailureResponse(`${message}`).send(res);
    }

    const accounts = await AccountService.getSingleWalletAccounts(
      transformedWallet._id
    );
    const token = await Jwt.issue(transformedWallet._id, "30d");

    return new SuccessResponse(message, {
      transformedWallet,
      accounts,
      token,
      device,
      message,
    }).send(res);
  }
);

export const getLoggedInWallet = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallet = req.wallet;
    const walletVault = await Vault.findOne({
      Wallet: req.wallet?._id,
    })
      .populate("transactions")
      .sort({ createdAt: -1 });
    const walletAssets = await VaultAsset.find({
      vault: walletVault?._id,
    });
    const accounts = await AccountService.getSingleWalletAccounts(
      req.wallet?._id
    );
    return new SuccessResponse("Wallet retrieved successfully", {
      wallet,
      accounts,
      vault: walletVault,
      walletAssets: walletAssets,
    }).send(res);
  }
);
