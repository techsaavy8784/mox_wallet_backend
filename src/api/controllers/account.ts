import asyncHandler from "../../helpers/asyncHandler";
import { Request, Response } from "express";
import AccountService from "../../services/account_service";
import {
  AuthFailureResponse,
  BadRequestResponse,
  NotFoundResponse,
  SuccessResponse,
} from "../../core/ApiResponse";
import { matchedData, validationResult } from "express-validator";
import { Types } from "mongoose";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import { ImportType } from "../../helpers/enums";
import { WalletDocument } from "../database/models/wallet.model";
import WalletService from "../../services/wallet_service";
import { AccountType } from "./wallet";

export const index = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallets = await AccountService.getAllPaginated(req.query);

    return new SuccessResponse("Accounts retrieved successfully", wallets).send(
      res
    );
  }
);

export const allBeneficiaries = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const accountId: any = req.query.accountId;

    const beneficiaries = await AccountService.getBeneficiaries(
      req.wallet?._id,
      res,
      accountId
    );

    return new SuccessResponse(
      "Beneficiaries retrieved successfully",
      beneficiaries
    ).send(res);
  }
);

export const store = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallet = await WalletService.getSingle(req.wallet?._id);

    if (!wallet) {
      return new NotFoundResponse(`could not find this wallet`).send(res);
    }

    if (wallet.accountType == AccountType.CUSTODIAL) {
      return new NotFoundResponse(
        `Custodial wallets are not allowed to have account`
      ).send(res);
    }

    const { account } = await AccountService.create(wallet._id.toString());

    const accounts = wallet?.accounts as Types.ObjectId[];

    await wallet?.updateOne({ account: [...accounts, account._id] });

    return new SuccessResponse(
      "Account account recovery successfully generated",
      { account }
    ).send(res);
  }
);

export const banAccount = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const { ban, address } = req.body;

    const bannedAccount = await AccountService.banAccount(address, ban);

    return new SuccessResponse("successfully update", bannedAccount).send(res);
  }
);

export const show = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const account = await AccountService.getSingle(
      req.wallet?._id,
      req.params.accountId as unknown as Types.ObjectId
    );

    return new SuccessResponse("Account retrieved successfully", account).send(
      res
    );
  }
);

export const showAdmin = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const account = await AccountService.getSingleById(
      req.params.accountId as unknown as Types.ObjectId
    );

    return new SuccessResponse("Account retrieved successfully", account).send(
      res
    );
  }
);

export const validateSecretPhrase = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { secretPhrase } = matchedData(req, { locations: ["body"] });

    const isValid = await AccountService.validateSecretPhrase(
      req.params.accountId,
      secretPhrase
    );

    if (!isValid) {
      return new BadRequestResponse(
        "The secret phrase do not match the ones associated with this account."
      ).send(res);
    }

    return new SuccessResponse(
      "Account account recovery words successfully validated",
      {
        isValid: isValid,
        message:
          "The secret phrase matches the ones associated with this account.",
      }
    ).send(res);
  }
);

export const createPassword = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { password } = matchedData(req, { locations: ["body"] });

    const account = await AccountService.createPassword(
      req.params.accountId,
      password
    );

    return new SuccessResponse(
      "Account password successfully created",
      account
    ).send(res);
  }
);

export const generateAddress = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const account = await AccountService.generateAddress(
      req.params.accountId,
      req.wallet?._id
    );

    return new SuccessResponse(
      "Account address successfully created",
      account
    ).send(res);
  }
);

export const addName = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { name } = matchedData(req, { locations: ["body"] });

    const account = await AccountService.addName(req.params.accountId, name);

    return new SuccessResponse("Account name successfully added", account).send(
      res
    );
  }
);

export const destroy = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallet = await AccountService.deleteSingle(
      req.params.accountId as unknown as Types.ObjectId
    );

    return new SuccessResponse("Account successfully deleted", wallet).send(
      res
    );
  }
);

export const getWalletAccounts = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    if (!req.wallet?._id.equals(req.params.walletId)) {
      throw new AuthFailureResponse("Cannot view this wallet's accounts");
    }

    const accounts = await AccountService.getSingleWalletAccounts(
      req.params.walletId
    );

    return new SuccessResponse("Accounts retrieved", accounts).send(res);
  }
);

export const importAccount = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { secretKey, recoveryPhrase } = matchedData(req, {
      locations: ["body"],
    });

    if (!secretKey && !recoveryPhrase) {
      return new BadRequestResponse(
        "Please provide a secret key or a recovery phrase"
      ).send(res);
    }

    const account = await AccountService.import(
      req.wallet as WalletDocument,
      secretKey ?? recoveryPhrase,
      secretKey ? ImportType.SecretKey : ImportType.RecoveryPhrase
    );

    return new SuccessResponse("Account imported", { account }).send(res);
  }
);

export const addBeneficiary = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    if (!req.wallet) {
      return new BadRequestResponse("Wallet not defined").send(res);
    }

    const { name, address } = matchedData(req, { locations: ["body"] });

    const beneficiary = await AccountService.addBeneficiary(
      req.wallet._id,
      name,
      address,
      req.query.accountId as string
    );

    return new SuccessResponse(
      "Beneficiary added successfully",
      beneficiary
    ).send(res);
  }
);

export const updateBeneficiary = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { name, address } = matchedData(req, {
      locations: ["body"],
    });

    if (!req.wallet) {
      return new BadRequestResponse("Wallet not defined").send(res);
    }

    const beneficiary = await AccountService.updateBeneficiary(
      req.params.beneficiaryId as unknown as Types.ObjectId,
      name,
      address
    );

    return new SuccessResponse(
      "Beneficiary updated successfully",
      beneficiary
    ).send(res);
  }
);

export const deleteBeneficiary = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const beneficiary = await AccountService.deleteBeneficiary(
      req.params.beneficiaryId as unknown as Types.ObjectId
    );

    return new SuccessResponse(
      "Beneficiary deleted successfully",
      beneficiary
    ).send(res);
  }
);
