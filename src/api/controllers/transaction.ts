import asyncHandler from "../../helpers/asyncHandler";
import { Request, Response } from "express";
import { BadRequestResponse, SuccessResponse } from "../../core/ApiResponse";
import TransactionService from "../../services/transaction_service";
import { matchedData, validationResult } from "express-validator";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import { Types } from "mongoose";
import Account from "../../api/database/models/account.model";
import { TokenRequestStatus } from "../../api/database/models/TokenRequests.model";
import WalletService from "../../services/wallet_service";
import { AuthFailureError } from "../../core/ApiError";
import Logger from "../../core/Logger";
import { levelEnum } from "../../api/database/models/trade.model";
import Transaction from "../../api/database/models/transaction.model";
import Wallet from "../../api/database/models/wallet.model";
import { AccountType } from "./wallet";
import SupportedCurrencies from "../../api/database/models/supportedCurrencies";

export const index = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const transactions = await WalletService.getransactions(req.query);

    return new SuccessResponse("Account transactions successfully retrieved", {
      transactions,
    }).send(res);
  }
);

export const getFees = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const { level, amount, transactionType }: any = req.query;

    const data = await TransactionService.getFees(
      level,
      parseFloat(amount),
      transactionType,
      res
    );

    return new SuccessResponse("Fees calculated", {
      data,
    }).send(res);
  }
);

export const analytics = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const { period, startDate, endDate }: any = req.query;
    let data;

    if (period !== "month" && period !== "week") {
      throw new BadRequestResponse("period should be week or month").send(res);
    }

    if (period == "week") {
      if (!startDate || !endDate) {
        throw new BadRequestResponse(
          "startDate and endDate are required for weekly analytics"
        ).send(res);
      }
    }

    if (period == "month") {
      data = await TransactionService.getAllMonthlyTransactions(res);
    }

    if (period == "week") {
      const startDateParts = startDate.split("/");
      const endDateParts = endDate.split("/");

      const startDateString = new Date(
        Number(startDateParts[2]),
        Number(startDateParts[1]) - 1,
        Number(startDateParts[0])
      );

      const endDateString = new Date(
        Number(endDateParts[2]),
        Number(endDateParts[1]) - 1,
        Number(endDateParts[0])
      );
      data = await TransactionService.getAllWeeklyTransactions(
        startDateString,
        endDateString,
        res
      );
    }

    return new SuccessResponse("Analytics retrieved", {
      data,
    }).send(res);
  }
);

export const countInfo = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const allTransactions = await Transaction.countDocuments();
    const allCustodial = await Wallet.find({
      accountType: AccountType.CUSTODIAL,
    });
    const allNonCustodial = await Wallet.find({
      accountType: AccountType.NON_CUSTODIAL,
    });
    const allCurrencies = await SupportedCurrencies.countDocuments();

    return new SuccessResponse("count info retrieved", {
      transactions: allTransactions,
      custodialUsers: allCustodial.length,
      nonCustodialUsers: allNonCustodial.length,
      currencies: allCurrencies,
    }).send(res);
  }
);

export const getTransactionsForSingleAccount = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const transactions = await TransactionService.getAllForSingleAccount(
      req.params.accountId as unknown as Types.ObjectId
    );

    return new SuccessResponse("Account transactions successfully retrieved", {
      transactions,
    }).send(res);
  }
);

export const transferNFToken = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { account, recipient, tokenId, reason } = matchedData(req, {
      locations: ["body"],
    });

    const receiverAccount = await Account.findOne({ address: recipient });

    if (!receiverAccount) {
      throw new BadRequestResponse(
        `can not find account with xrp address ${recipient}`
      );
    }

    const transaction = await TransactionService.transferNFToken(
      req.wallet?._id,
      account as Types.ObjectId,
      receiverAccount,
      tokenId,
      reason
    );

    return new SuccessResponse(
      "NFToken has been successfully transferred wait for the recepient to approve",
      transaction
    ).send(res);
  }
);

export const transfer = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { account, recipient, amount, currency, level, reason } = req.body;
    if (!WalletService.isValidLevel(level, levelEnum)) {
      return new BadRequestResponse(
        `${level} is not a valid level value, only [WALLET, ACCOUNT]`
      ).send(res);
    }
    let transaction;

    if (level === levelEnum.ACCOUNT) {
      transaction = await TransactionService.accountSendXRPTokens(
        req.wallet?._id,
        account as Types.ObjectId,
        recipient,
        amount,
        currency,
        res,
        reason
      );
    }
    if (level === levelEnum.WALLET) {
      transaction = await TransactionService.walletSendXrpTokens(
        req.wallet?._id,
        recipient,
        amount,
        currency,
        res,
        reason
      );
    }

    return new SuccessResponse(
      "Token has been successfully transferred",
      transaction
    ).send(res);
  }
);

export const show = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallet = await TransactionService.getSingle(
      req.params.transactionId as unknown as Types.ObjectId
    );

    return new SuccessResponse(
      "Transaction retrieved successfully",
      wallet
    ).send(res);
  }
);

export const approveNFToken = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const { status, TokenRequestId, type } = matchedData(req, {
      locations: ["body"],
    });

    const TokenRequest = await WalletService.getTokenRequestById(
      TokenRequestId
    );
    if (!req.wallet?._id.equals(TokenRequest?.receiverId)) {
      throw new AuthFailureError("Cannot view this wallet's accounts");
    }

    if (!TokenRequest) {
      throw new BadRequestResponse(
        `NFToken Request with id ${TokenRequestId} does not exist`
      );
    }

    if (status === TokenRequestStatus.ACCEPTED) {
      const tx = await TransactionService.acceptNFTokenTransferRequest(
        TokenRequestId,
        req.wallet?._id,
        TokenRequest.receiverAccount,
        TokenRequest.senderAccount,
        TokenRequest.senderId,
        TokenRequest.transactionId,
        type,
        TokenRequest.NFTokenOfferIndex
      );
      return new SuccessResponse(
        "NFToken Transfer Request accepted successfully",
        tx
      ).send(res);
    } else {
      const tx = await TransactionService.rejectNFTokenTransferRequest(
        TokenRequestId,
        TokenRequest.senderId,
        TokenRequest.senderAccount,
        TokenRequest.transactionId
      );

      return new SuccessResponse(
        "NFToken Transfer Request rejected successfully",
        tx
      ).send(res);
    }
  }
);

export const destroy = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallet = await TransactionService.deleteSingle(
      req.params.transactionId as unknown as Types.ObjectId
    );

    return new SuccessResponse("Transaction successfully deleted", wallet).send(
      res
    );
  }
);
