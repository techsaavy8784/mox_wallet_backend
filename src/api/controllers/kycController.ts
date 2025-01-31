import asyncHandler from "../../helpers/asyncHandler";
import { Request, Response } from "express";
import {
  BadRequestResponse,
  NotFoundResponse,
  SuccessMsgResponse,
  SuccessResponse,
} from "../../core/ApiResponse";
import KYCService from "../../services/kyc.service";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import { matchedData, validationResult } from "express-validator";
import { Types } from "mongoose";
import Wallet from "../../api/database/models/wallet.model";
import WalletService from "../../services/wallet_service";
import { KYCStatus } from "../../api/database/models/kyc.model";

export const index = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const kycs = await KYCService.getAll();

    return new SuccessResponse("kycs successfully fetched", kycs).send(res);
  }
);

export const store = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const data = matchedData(req, { locations: ["body"] });
    const wallet = await WalletService.getSingle(req.wallet?.id);

    if (!wallet) {
      return new NotFoundResponse(`could not find this wallet`).send(res);
    }

    const payload = {
      ...data,
      email: wallet.email,
    };

    const kyc = await KYCService.addKYC(req.wallet?._id, payload);
    await wallet.updateOne({ kycStatus: KYCStatus.PENDING });

    if (wallet.email) {
      await WalletService.sendEmailToCustodialWallet(
        {
          email: wallet.email,
          data: {},
        },
        process.env.KYC_ONGOING as string,
        "KYC ongoing"
      );
    }

    return new SuccessResponse("kyc successfully added", kyc).send(res);
  }
);

export const changeStatus = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { status } = matchedData(req, { locations: ["body"] });

    const kyc = await KYCService.getSingle(req.params.kycId);

    if (!kyc) {
      return new NotFoundResponse(`could not find this kyc`).send(res);
    }

    const wallet: any = await WalletService.getSingle(kyc.Wallet);
    if (!wallet) {
      return new NotFoundResponse(`could not find this wallet`).send(res);
    }

    if (status === KYCStatus.APPROVED) {
      await WalletService.sendEmailToCustodialWallet(
        {
          email: wallet.email,
          data: {},
        },
        process.env.KYC_APPROVED as string,
        "KYC APPROVED"
      );
    }

    if (status === KYCStatus.DECLINED) {
      await WalletService.sendEmailToCustodialWallet(
        {
          email: wallet.email,
          data: {},
        },
        process.env.KYC_DECLINED as string,
        "KYC Declined"
      );
    }

    await kyc.updateOne({ kycStatus: status });
    await wallet.updateOne({ kycStatus: status });

    return new SuccessResponse("kyc successfully added", kyc).send(res);
  }
);

export const show = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const kyc = await KYCService.getSingle(req.params.kycId);

    return new SuccessResponse("kyc successfully fetched", kyc).send(res);
  }
);

export const walletKYC = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const kyc = await KYCService.getSingleForWallet(req.wallet?._id);

    return new SuccessResponse("kyc successfully fetched", kyc).send(res);
  }
);

export const destroy = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const onekyc = await KYCService.getSingle(req.params.kycId);

    if (!onekyc) {
      return new NotFoundResponse(`Cannot find kyc`).send(res);
    }

    const kyc = await KYCService.deleteKYC(req.params.kycId);

    return new SuccessResponse("kyc successfully deleted", kyc).send(res);
  }
);
