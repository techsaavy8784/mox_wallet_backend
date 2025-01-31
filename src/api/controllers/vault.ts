import asyncHandler from "../../helpers/asyncHandler";
import { Request, Response } from "express";
import {
  BadRequestResponse,
  NotFoundResponse,
  SuccessMsgResponse,
  SuccessResponse,
} from "../../core/ApiResponse";
import VaultService from "../../services/vault.service";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import { matchedData, validationResult } from "express-validator";
import { Types } from "mongoose";
import Vault from "../../api/database/models/vault.model";
import WalletService from "../../services/account_service";

export const index = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const Vaults = await VaultService.getAll();

    return new SuccessResponse("Vaults successfully fetched", Vaults).send(res);
  }
);

export const show = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const Vault = await VaultService.getSingle(
      req.params.VaultId as unknown as Types.ObjectId
    );

    return new SuccessResponse("Vault successfully fetched", Vault).send(res);
  }
);
