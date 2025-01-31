import asyncHandler from "../../helpers/asyncHandler";
import { Request, Response } from "express";
import {
  BadRequestResponse,
  NotFoundResponse,
  SuccessResponse,
} from "../../core/ApiResponse";
import SupportedCurrencyService from "../../services/SupportedCurrencyService";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import { matchedData, validationResult } from "express-validator";
import { Types } from "mongoose";
import cc from "currency-codes";
import Account, {
  AccountDocument,
} from "../../api/database/models/account.model";
import TransactionService, {
  TransactionTypeFee,
} from "../../services/transaction_service";
import AccountService from "../../services/account_service";
import {
  CURRENCY_CONVERSION_FEE_RATE,
  rippleNetwork,
  environment,
  issuerAddress,
} from "../../config/index";
import Transaction, {
  TransactionType,
  TransactionStatus,
} from "../../api/database/models/transaction.model";
import ripple from "mox-ripple";
import Vault from "../../api/database/models/vault.model";
import { operatorBalance, operatorXRPBalance } from "./wallet";
import { levelEnum } from "../../api/database/models/trade.model";
import WalletService from "../../services/wallet_service";
import PusherService from "../../services/pusher";

const RippleService = new ripple(
  rippleNetwork,
  environment as string,
  issuerAddress as string
);

export interface IUpdateSupportedCurrency {
  name: string;
  supply: number;
  image?: string;
  code?: string;
}

export const index = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const SupportedCurrencys = await SupportedCurrencyService.getAll();

    return new SuccessResponse(
      "SupportedCurrencies successfully fetched",
      SupportedCurrencys
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

    const { name, symbol, supply, image, code } = matchedData(req, {
      locations: ["body"],
    });

    if (!process.env.ISSUER_ADDRESS) {
      throw new BadRequestResponse(`issuer address can not be found`).send(res);
    }

    const operatorAccount: AccountDocument | null = await Account.findById(
      process.env.OPERATOR_WALLET_ID
    )
      .select("+secret")
      .fill("balance")
      .fill("assets");

    if (!operatorAccount) {
      throw new BadRequestResponse(`operator account could not be found`).send(
        res
      );
    }

    if (symbol.toUpperCase() == "XRP") {
      const currentXRPSupply = await operatorXRPBalance(res);

      if (currentXRPSupply <= supply) {
        throw new BadRequestResponse(
          `not enough XRP balance in Operator account`
        ).send(res);
      }
    }

    const currency = await SupportedCurrencyService.getSingleBySymbol(
      symbol.toUpperCase()
    );

    if (currency) {
      return new BadRequestResponse("currency already added").send(res);
    }

    const OperatorCurrencyBalance = operatorAccount?.assets;
    if (!OperatorCurrencyBalance?.assets) {
      throw new BadRequestResponse(`Operator has no trustline currency`).send(
        res
      );
    }

    const OperatorBalance: any = OperatorCurrencyBalance?.assets[
      process.env.ISSUER_ADDRESS
    ].filter((each: any) => each.currency === symbol.toUpperCase());

    if (supply <= 0) {
      return new BadRequestResponse("supply should be above 0").send(res);
    }

    if (!OperatorBalance[0]?.value && symbol.toUpperCase() !== "XRP") {
      throw new BadRequestResponse(`Sender has 0 ${symbol.toUpperCase()}`).send(
        res
      );
    }
    if (
      supply > parseFloat(OperatorBalance[0]?.value) &&
      symbol.toUpperCase() !== "XRP"
    ) {
      throw new BadRequestResponse(
        `Supply should be less or equal to operator current trustline balance`
      ).send(res);
    }
    const codes = cc.codes();

    if (
      symbol.toUpperCase() !== "XRP" &&
      !codes.some((code: string) => code == symbol.toUpperCase())
    )
      return new BadRequestResponse("Invalid currency provided").send(res);

    const SupportedCurrency =
      await SupportedCurrencyService.addSupportedCurrency(
        name,
        symbol.toUpperCase(),
        supply,
        image,
        code,
        req
      );

    return new SuccessResponse(
      "SupportedCurrency successfully added",
      SupportedCurrency
    ).send(res);
  }
);

export const show = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const SupportedCurrency = await SupportedCurrencyService.getSingle(
      req.params.id as unknown as Types.ObjectId
    );

    if (!SupportedCurrency) {
      throw new BadRequestResponse(
        `SupportedCurrency  could not be found`
      ).send(res);
    }

    const currencyTransaction = await TransactionService.getAllCurrencyData(
      SupportedCurrency.symbol ?? "USD"
    );

    return new SuccessResponse("SupportedCurrencies successfully fetched", {
      currency: SupportedCurrency,
      data: currencyTransaction,
    }).send(res);
  }
);

export const convert = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const { to } = req.query;

    if (to !== "XRP" && to !== "USD") {
      return new BadRequestResponse("to should only be XRP or USD").send(res);
    }
    const currency = await SupportedCurrencyService.getSingleBySymbol(
      req.params.currency
    );

    if (!currency) {
      return new BadRequestResponse("currency isn't not supported by MOX").send(
        res
      );
    }

    let amount = parseFloat(req.params.amount);

    if (to == "USD") {
      //FIXME: Change this method back to convertCurrencyToUSD()
      amount = await SupportedCurrencyService.convertGHSCurrencyToUSD(
        currency.symbol as string,
        amount
      );
    }

    if (to === "XRP") {
      const usdAmount = await SupportedCurrencyService.convertXrpToUsd(
        parseFloat(req.params.amount)
      );

      const rate = await SupportedCurrencyService.convertRate(
        "USD",
        currency.symbol as string
      );

      if (currency.symbol === "USD") {
        amount = usdAmount;
      } else if (currency.symbol === "XRP") {
        amount = parseFloat(req.params.amount);
      } else {
        amount = rate * usdAmount;
      }
    }

    return new SuccessResponse("amount successfully generated", amount).send(
      res
    );
  }
);

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const { name, supply, code } = req.body;

    const SupportedCurrency = await SupportedCurrencyService.getSingle(
      req.params.id as unknown as Types.ObjectId
    );

    if (!SupportedCurrency) {
      throw new BadRequestResponse(
        `SupportedCurrency  could not be found`
      ).send(res);
    }

    if (!process.env.ISSUER_ADDRESS) {
      throw new BadRequestResponse(`issuer address can not be found`).send(res);
    }

    const operatorAccount: AccountDocument | null = await Account.findById(
      process.env.OPERATOR_WALLET_ID
    )
      .select("+secret")
      .fill("balance")
      .fill("assets");

    if (!operatorAccount) {
      throw new BadRequestResponse(`operator account could not be found`).send(
        res
      );
    }

    const OperatorCurrencyBalance = operatorAccount?.assets;
    if (!OperatorCurrencyBalance?.assets) {
      throw new BadRequestResponse(`Operator has no trustline currency`).send(
        res
      );
    }
    const OperatorBalance: any = OperatorCurrencyBalance?.assets[
      process.env.ISSUER_ADDRESS
    ].filter((each: any) => each.currency === SupportedCurrency.symbol);

    if (supply <= 0) {
      return new BadRequestResponse("supply should be above 0").send(res);
    }

    if (supply > parseFloat(OperatorBalance[0]?.value)) {
      throw new BadRequestResponse(
        `Supply should be less or equal to operator current trustline balance`
      ).send(res);
    }

    const updatedSupportedCurrency =
      await SupportedCurrencyService.updateSupportedCurrency(
        req.params.id as unknown as Types.ObjectId,
        { name, supply, code },
        req
      );

    return new SuccessResponse("SupportedCurrencies successfully updated", {
      SupportedCurrency: updatedSupportedCurrency,
    }).send(res);
  }
);

export const destroy = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const SupportedCurrency =
      await SupportedCurrencyService.deleteSupportedCurrency(req.params.id);

    return new SuccessResponse(
      "SupportedCurrency successfully deleted",
      SupportedCurrency
    ).send(res);
  }
);

export const swappCurrency = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const { amount, accountId, baseCurrency, targetCurrency, reason } =
      matchedData(req, {
        locations: ["body"],
      });

    if (!process.env.ISSUER_ADDRESS) {
      throw new BadRequestResponse(`issuer address can not be found`).send(res);
    }

    const wallet = await WalletService.getSingle(req.wallet?._id);

    if (!wallet) {
      return new NotFoundResponse(`could not find this wallet`).send(res);
    }

    if (wallet.isBanned) {
      return new NotFoundResponse(`This Wallet is banned`).send(res);
    }

    const baseSupportedCurrency =
      await SupportedCurrencyService.getSingleBySymbol(baseCurrency);

    if (!baseSupportedCurrency)
      return new NotFoundResponse(
        "base Currency is not supported by MOX "
      ).send(res);

    const targetSupportedCurrency =
      await SupportedCurrencyService.getSingleBySymbol(targetCurrency);

    if (!targetSupportedCurrency)
      return new NotFoundResponse(
        "target Currency is not supported by MOX "
      ).send(res);

    if (targetSupportedCurrency._id === baseSupportedCurrency._id)
      return new NotFoundResponse("base and target cannot be the same").send(
        res
      );

    const currentSupply = await operatorBalance(res, targetCurrency);

    if (currentSupply <= amount) {
      throw new BadRequestResponse(`Maximum supply reached`).send(res);
    }

    const walletAccount = await Account.findOne({
      _id: accountId,
    })
      .select("+secret")
      .fill("balance")
      .fill("assets");

    if (!walletAccount)
      return new NotFoundResponse(
        "You don't have the account associated with this id "
      ).send(res);

    if (walletAccount.isBanned) {
      return new NotFoundResponse(`This Account is banned`).send(res);
    }

    const fees = await TransactionService.getFees(
      levelEnum.ACCOUNT,
      amount,
      TransactionTypeFee.SWAP,
      res
    );

    const walletBalance = walletAccount?.assets;
    if (!walletBalance?.assets) {
      throw new BadRequestResponse(`Sender has no trustline currency`).send(
        res
      );
    }
    const senderBalance: any = walletBalance?.assets[
      process.env.ISSUER_ADDRESS
    ].filter((each: any) => each.currency === baseCurrency);

    if (!senderBalance[0]?.value) {
      throw new BadRequestResponse(`Sender has 0 ${baseCurrency}`).send(res);
    }

    if (parseFloat(senderBalance[0]?.value) < amount) {
      throw new BadRequestResponse(`Insufficient funds`).send(res);
    }

    const senderAccount = await Account.findById(
      process.env.OPERATOR_WALLET_ID
    ).select("+secret");

    if (!senderAccount) {
      throw new BadRequestResponse(
        `can not find account with id ${process.env.OPERATOR_WALLET_ID}`
      ).send(res);
    }

    const rate = await SupportedCurrencyService.convertRate(
      baseCurrency,
      targetCurrency
    );

    if (!rate)
      new BadRequestResponse(
        "Error occurred while converting the currencies"
      ).send(res);

    const transaction:any = await Transaction.create({
      senderId: walletAccount.walletId,
      senderAccount: walletAccount._id,
      toAmount: rate * fees.amountToTransact,
      amount: fees.amountToTransact,
      senderAddress: walletAccount.address,
      status: TransactionStatus.PENDING,
      type: TransactionType.SWAP,
      currency: baseCurrency,
      toCurrency: targetCurrency,
      reason,
    });

    const tx1: any = await RippleService.sellCurrecy(
      res,
      walletAccount.secret,
      baseCurrency,
      amount,
      transaction
    );

    const tx1Success = tx1?.result.meta.TransactionResult == "tesSUCCESS";

    if (tx1Success) {
      const tx: any = await RippleService.sendCurrecy(
        res,
        walletAccount.secret,
        senderAccount.secret,
        walletAccount?.address,
        targetCurrency,
        rate * fees.amountToTransact,
        transaction
      );
      const txSuccess = tx?.result.meta.TransactionResult == "tesSUCCESS";

      await transaction?.updateOne({
        hashLink: TransactionService.formatHashLink(tx?.result?.hash) ?? "",
        status: txSuccess
          ? TransactionStatus.SUCCESS
          : TransactionStatus.FAILED,
      });

      if (wallet.enableNotification) {
        const sender = "Mox";
        const receiver = wallet.name ?? wallet.email ?? walletAccount.address;
        PusherService.triggerEvent(
          wallet?.notificationToken as string,
          `Currency conversion is successful`,
          {
            sender,
            message: `you have converted ${amount} ${baseCurrency} to ${
              rate * fees.amountToTransact
            } ${targetCurrency}`,
            receiver: receiver,
            createdAt: transaction.createdAt,
          }
        );
      }
    } else {
      await WalletService.sellingRefund(
        walletAccount.walletId,
        levelEnum.WALLET,
        amount,
        baseSupportedCurrency,
        res,
        accountId
      );
      await transaction?.updateOne({
        status: TransactionStatus.FAILED,
      });
    }

    await senderAccount.updateOne({
      transactions: [...senderAccount.transactions, transaction._id],
    });

    await walletAccount.updateOne({
      transactions: [...walletAccount.transactions, transaction._id],
    });

    return new SuccessResponse("Currency converted", {
      transaction: await TransactionService.getSingle(transaction.id),
      from: baseCurrency,
      to: targetCurrency,
      amount: fees.amountToTransact,
      fees,
      chargeAmount: fees.amountToTransact + fees.fee,
    }).send(res);
  }
);

export const getConversionDetails = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const { amount, baseCurrency, targetCurrency }: any = req.query;

    if (!process.env.ISSUER_ADDRESS) {
      throw new BadRequestResponse(`issuer address can not be found`).send(res);
    }

    const baseSupportedCurrency =
      await SupportedCurrencyService.getSingleBySymbol(baseCurrency);

    if (!baseSupportedCurrency)
      return new NotFoundResponse(
        "base Currency is not supported by MOX "
      ).send(res);

    const targetSupportedCurrency =
      await SupportedCurrencyService.getSingleBySymbol(targetCurrency);

    if (!targetSupportedCurrency)
      return new NotFoundResponse(
        "target Currency is not supported by MOX "
      ).send(res);

    if (targetSupportedCurrency._id === baseSupportedCurrency._id)
      return new NotFoundResponse("base and target cannot be the same").send(
        res
      );

    const fees = await TransactionService.getFees(
      levelEnum.ACCOUNT,
      amount,
      TransactionTypeFee.SWAP,
      res
    );

    const rate = await SupportedCurrencyService.convertRate(
      baseCurrency,
      targetCurrency
    );

    if (!rate)
      new BadRequestResponse(
        "Error occurred while converting the currencies"
      ).send(res);

    const finalAmount = rate * fees.amountToTransact;

    return new SuccessResponse("fees generated", {
      fee: fees.fee,
      amountToConvert: fees.amountToTransact,
      rate,
      amountToReceive: finalAmount,
    }).send(res);
  }
);
