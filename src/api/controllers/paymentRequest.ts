import asyncHandler from "../../helpers/asyncHandler";
import { Request, Response } from "express";
import {
  BadRequestResponse,
  NotFoundResponse,
  SuccessMsgResponse,
  SuccessResponse,
} from "../../core/ApiResponse";
import PaymentRequestService from "../../services/paymentRequest.service";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import { matchedData, validationResult } from "express-validator";
import { Types } from "mongoose";
import Wallet from "../../api/database/models/wallet.model";
import WalletService from "../../services/wallet_service";
import { PaymentRequestStatus } from "../../api/database/models/paymentRequest";
import SupportedCurrencyService from "../../services/SupportedCurrencyService";
import VaultAsset from "../../api/database/models/vaultAsset.model";
import Vault from "../../api/database/models/vault.model";
import { Decode } from "xrpl-tagged-address-codec";
import TransactionService, {
  TransactionTypeFee,
} from "../../services/transaction_service";
import { levelEnum } from "../../api/database/models/trade.model";
import Transaction, {
  TransactionStatus,
  TransactionType,
} from "../../api/database/models/transaction.model";

export const index = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const paymentRequests = await PaymentRequestService.getAll();

    return new SuccessResponse(
      "paymentRequests successfully fetched",
      paymentRequests
    ).send(res);
  }
);

export const store = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const data = matchedData(req, { locations: ["body"] });

    const receiverVault = await Vault.findOne({ Wallet: req.wallet?._id });

    if (!receiverVault) {
      throw new BadRequestResponse(`can not find receiver wallet vault`).send(
        res
      );
    }

    if (receiverVault.isGrandVault) {
      throw new BadRequestResponse(
        `operator can not ask for any direct payment`
      ).send(res);
    }

    if (req.wallet?.isBanned === true) {
      throw new BadRequestResponse(
        `Account with id ${req.wallet?._id} is banned`
      ).send(res);
    }
    const isPayerEmail = emailRegex.test(data.payer);

    const tag = await TransactionService.getRecipientTag(
      isPayerEmail,
      data.payer,
      res
    );

    if (tag === 0) {
      throw new BadRequestResponse(`the payer does not exist`).send(res);
    }

    const senderVault = await Vault.findOne({
      tag: parseInt(tag),
    });

    if (!senderVault) {
      throw new BadRequestResponse(`can not find payer vault`).send(res);
    }

    const toWallet = await WalletService.getSingle(senderVault.Wallet);

    if (!toWallet) {
      return new NotFoundResponse(`could not find the payer`).send(res);
    }

    const currency = await SupportedCurrencyService.getSingleBySymbol(
      data.currencySymbol
    );

    if (!currency)
      return new NotFoundResponse("Currency is not supported by MOX ").send(
        res
      );

    const payload = {
      Wallet: req.wallet?._id,
      toWallet: toWallet._id,
      amount: data.amount,
      reason: data.reason,
      currencySymbol: data.currencySymbol,
      payer: parseInt(tag),
      requester: receiverVault.tag,
    };

    const paymentRequest = await PaymentRequestService.addPaymentRequest(
      req.wallet?._id,
      payload
    );

    if (toWallet.email) {
      await WalletService.sendEmailToCustodialWallet(
        {
          email: toWallet.email,
          data: {
            amount: `${data.currencySymbol} ${data.amount}`,
            sender: toWallet.name ?? toWallet.email ?? senderVault?.address,
            receiver:
              req.wallet?.name ?? req.wallet?.email ?? receiverVault.address,
            reason: data.reason,
          },
        },
        process.env.PAYMENT_REQUEST as string,
        "PaymentRequest ongoing"
      );
    }

    return new SuccessResponse(
      "paymentRequest successfully added",
      paymentRequest
    ).send(res);
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

    const paymentRequest: any = await PaymentRequestService.getSingle(
      req.params.paymentRequestId
    );

    if (!paymentRequest) {
      return new NotFoundResponse(`could not find this paymentRequest`).send(
        res
      );
    }

    if (paymentRequest.PaymentRequestStatus !== PaymentRequestStatus.PENDING) {
      return new NotFoundResponse(
        `This payment Request has been ${paymentRequest.PaymentRequestStatus} in the past`
      ).send(res);
    }
    const RequesterWallet = await WalletService.getSingle(
      paymentRequest.Wallet
    );

    if (!RequesterWallet) {
      return new NotFoundResponse(`could not find this requester wallet`).send(
        res
      );
    }

    const PayerWallet = await WalletService.getSingle(paymentRequest.toWallet);

    if (!PayerWallet) {
      return new NotFoundResponse(`could not find this payer wallet`).send(res);
    }

    if (paymentRequest.toWallet.toString() !== req.wallet?._id.toString()) {
      return new NotFoundResponse(`user not the requested payer`).send(res);
    }

    if (status === PaymentRequestStatus.APPROVED) {
      const senderVault = await Vault.findOne({ Wallet: req.wallet?._id });

      if (!senderVault) {
        throw new BadRequestResponse(`can not find wallet vault`).send(res);
      }

      if (senderVault.isGrandVault) {
        throw new BadRequestResponse(
          `operator can not send any direct payment`
        ).send(res);
      }

      const SupportedCurrency =
        await SupportedCurrencyService.getSingleBySymbol(
          paymentRequest.currencySymbol
        );

      if (!SupportedCurrency) {
        throw new BadRequestResponse("Currency type not supported").send(res);
      }

      const senderAsset = await VaultAsset.findOne({
        vault: senderVault,
        SupportedCurrency,
      });

      if (!senderAsset) {
        throw new BadRequestResponse(
          `Sender has no ${SupportedCurrency.symbol} currency`
        ).send(res);
      }

      if (senderAsset.balance < parseFloat(paymentRequest.amount)) {
        throw new BadRequestResponse(`Insufficient funds`).send(res);
      }

      if (senderVault.tag === paymentRequest.requester) {
        throw new BadRequestResponse(
          `can not send funds to your own account`
        ).send(res);
      }

      const fees = await TransactionService.getFees(
        levelEnum.WALLET,
        parseFloat(paymentRequest.amount),
        TransactionTypeFee.WALLET_TO_WALLET_TRANSFER,
        res
      );

      const transaction = await Transaction.create({
        senderId: req.wallet?._id,
        senderMoxId: senderVault.tag,
        amount: parseFloat(paymentRequest.amount),
        senderAddress: senderVault.address,
        status: TransactionStatus.PENDING,
        receiverEmail: RequesterWallet.email,
        type: TransactionType.OTHER,
        currency: paymentRequest.currencySymbol,
        reason: paymentRequest.reason,
      });

      await senderAsset?.updateOne({
        balance: senderAsset.balance - parseFloat(paymentRequest.amount),
      });
      const transactions = senderVault.transactions;
      await senderVault.updateOne({
        transactions: [...transactions, transaction._id],
      });

      await TransactionService.endTransfer(
        senderVault.address,
        paymentRequest.requester,
        transaction,
        SupportedCurrency._id.toString(),
        paymentRequest.currencySymbol,
        fees.amountToTransact,
        res,
        false,
        fees.fee,
        fees.feePercentage,
        PayerWallet?._id.toString(),
        parseFloat(paymentRequest.amount),
        PayerWallet.email,
        PayerWallet.name
      );

      await WalletService.sendEmailToCustodialWallet(
        {
          email: RequesterWallet.email as string,
          data: {
            amount: `${paymentRequest.currencySymbol} ${fees.amountToTransact}`,
            sender:
              PayerWallet.name ?? PayerWallet.email ?? senderVault?.address,
            receiver: RequesterWallet.name ?? RequesterWallet.email,
          },
        },
        process.env.PAYMENT_REQUEST_APPROVED as string,
        "PaymentRequest APPROVED"
      );
    }

    if (status === PaymentRequestStatus.DECLINED) {
      await WalletService.sendEmailToCustodialWallet(
        {
          email: RequesterWallet.email as string,
          data: {
            amount: `${paymentRequest.currencySymbol} ${paymentRequest.amount}`,
            sender: PayerWallet.name ?? PayerWallet.email,
          },
        },
        process.env.PAYMENT_REQUEST_DECLINED as string,
        "PaymentRequest Declined"
      );
    }

    await paymentRequest.updateOne({ PaymentRequestStatus: status });

    return new SuccessResponse(
      "paymentRequest successfully added",
      paymentRequest
    ).send(res);
  }
);

export const show = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const paymentRequest = await PaymentRequestService.getSingle(
      req.params.paymentRequestId
    );

    return new SuccessResponse(
      "paymentRequest successfully fetched",
      paymentRequest
    ).send(res);
  }
);

export const walletReceivedPaymentRequest = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const paymentRequest = await PaymentRequestService.getReceivedForWallet(
      req.wallet?._id
    );

    return new SuccessResponse(
      "received paymentRequest successfully fetched",
      paymentRequest
    ).send(res);
  }
);

export const walletSentPaymentRequest = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const paymentRequest = await PaymentRequestService.getSentForWallet(
      req.wallet?._id
    );

    return new SuccessResponse(
      "sent paymentRequest successfully fetched",
      paymentRequest
    ).send(res);
  }
);

export const destroy = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const onepaymentRequest = await PaymentRequestService.getSingle(
      req.params.paymentRequestId
    );

    if (!onepaymentRequest) {
      return new NotFoundResponse(`Cannot find paymentRequest`).send(res);
    }

    const paymentRequest = await PaymentRequestService.deletePaymentRequest(
      req.params.paymentRequestId
    );

    return new SuccessResponse(
      "paymentRequest successfully deleted",
      paymentRequest
    ).send(res);
  }
);
