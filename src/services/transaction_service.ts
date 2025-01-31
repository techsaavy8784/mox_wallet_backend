import Account, { AccountDocument } from "../api/database/models/account.model";
import Transaction, {
  TransactionStatus,
  TransactionType,
} from "../api/database/models/transaction.model";
import { Types } from "mongoose";
import ripple from "mox-ripple";
import { BadRequestError, NotFoundError } from "../core/ApiError";
import TokenRequest, {
  TokenRequestStatus,
  TokenRequestType,
} from "../api/database/models/TokenRequests.model";
import PusherService, { PusherEvent } from "./pusher";
import WalletService from "./wallet_service";
import { Response, Request } from "express";
import {
  BadRequestResponse,
  InternalErrorResponse,
  NotFoundResponse,
  SuccessResponse,
} from "../core/ApiResponse";
import PaginationService from "./paginate";
import AccountService from "./account_service";
import NotificationService from "./notification_service";
import { environment, issuerAddress, rippleNetwork } from "../config";
import VaultService from "./vault.service";
import Vault from "../api/database/models/vault.model";
import VaultAsset from "../api/database/models/vaultAsset.model";
import SupportedCurrencyService from "./SupportedCurrencyService";
import { Encode, Decode } from "xrpl-tagged-address-codec";
import { levelEnum } from "../api/database/models/trade.model";
import Cashes from "../api/database/models/cashe.model";
import moment from "moment";
import { IIattachmentTransaction, createReceipt } from "./pdfGenerator";

interface CurrencyHoldersTransactions {
  account: AccountDocument;
  balance: number;
  Nfts: any[];
  transactions: { receivedTransactions: any[]; sentTransactions: any[] };
}

export enum TransactionTypeFee {
  ACCOUNT_BUY = "ACCOUNT_BUY",
  WALLET_BUY = "WALLET_BUY",
  ACCOUNT_TO_ACCOUNT_TRANSFER = "ACCOUNT_TO_ACCOUNT_TRANSFER",
  ACCOUNT_TO_WALLET_TRANSFER = "ACCOUNT_TO_WALLET_TRANSFER",
  WALLET_TO_WALLET_TRANSFER = "WALLET_TO_WALLET_TRANSFER",
  WALLET_TO_ACCOUNT_TRANSFER = "WALLET_TO_ACCOUNT_TRANSFER",
  WALLET_SELL = "WALLET_SELL",
  ACCOUNT_SELL = "ACCOUNT_SELL",
  BUY_XRP = "BUY_XRP",
  SWAP = "SWAP",
  RETAIL = "RETAIL",
}

const RippleService = new ripple(
  rippleNetwork,
  environment as string,
  issuerAddress as string
);

class TransactionService {
  public static async getAllWalletCurrencyTransaction(
    accountId: string,
    currency: string
  ) {
    const transactions = await Transaction.aggregate([
      {
        $match: {
          $or: [{ currency: currency }, { toCurrency: currency }],
        },
      },
      {
        $match: {
          $or: [{ senderAccount: accountId }, { receiverAccount: accountId }],
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 3 },
    ]);

    return transactions;
  }

  public static async getAllAccountCurrencyTransaction(
    moxId: string,
    currency: string
  ) {
    const transactions = await Transaction.aggregate([
      {
        $match: {
          $or: [{ currency: currency }, { toCurrency: currency }],
        },
      },
      {
        $match: {
          $or: [
            { recepientMoxId: parseInt(moxId) },
            { senderMoxId: parseInt(moxId) },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 3 },
    ]);

    return transactions;
  }

  public static async getAllCurrencyData(currency: string) {
    let match = { currency: currency };

    const transactions = await Transaction.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
    ]);

    // const holders: CurrencyHoldersTransactions[] =
    //   [] as unknown as CurrencyHoldersTransactions[];

    const allAccounts = await AccountService.getAll();

    const accountPromises = allAccounts.map(async (eachAccount) => {
      const balance = eachAccount?.assets;

      if (balance?.assets) {
        const amountToReturn = balance?.assets[
          process.env.ISSUER_ADDRESS ?? ""
        ].filter((each: any) => each.currency === currency);

        if (amountToReturn.length !== 0) {
          return {
            account: eachAccount.address,
            balance: parseFloat(amountToReturn[0]?.value) ?? 0,
          };
        }
      }
    });

    const holders = await Promise.all(accountPromises);

    return {
      transactions,
      holders: holders
        .filter((el) => el != null)
        .sort((a: any, b: any) => a?.balance - b?.balance)
        .reverse(),
    };
  }

  public static formatHashLink(hash: string): string {
    return process.env.NODE_ENV === "development"
      ? `${process.env.TESTNET_EXPLORER}/${hash}`
      : `${process.env.MAINNET_EXPLORER}/${hash}`;
  }

  public static getFees(
    lnLevel: levelEnum,
    amount: number,
    transactionType: TransactionTypeFee,
    res: Response
  ) {
    let feePercentage: any;
    let fee = 0;

    switch (transactionType) {
      case TransactionTypeFee.ACCOUNT_BUY:
        feePercentage = process.env.ACCOUNT_BUY_FEE;
        break;
      case TransactionTypeFee.WALLET_BUY:
        feePercentage = process.env.WALLET_BUY_FEE;
        break;
      case TransactionTypeFee.ACCOUNT_TO_ACCOUNT_TRANSFER:
        feePercentage = process.env.ACCOUNT_TO_ACCOUNT_TRANSFER;
        break;
      case TransactionTypeFee.ACCOUNT_TO_WALLET_TRANSFER:
        feePercentage = process.env.ACCOUNT_TO_WALLET_TRANSFER;
        break;
      case TransactionTypeFee.WALLET_TO_WALLET_TRANSFER:
        feePercentage = process.env.WALLET_TO_WALLET_TRANSFER;
        break;
      case TransactionTypeFee.WALLET_TO_ACCOUNT_TRANSFER:
        feePercentage = process.env.WALLET_TO_ACCOUNT_TRANSFER;
        break;
      case TransactionTypeFee.WALLET_SELL:
        feePercentage = process.env.WALLET_SELL;
        break;
      case TransactionTypeFee.ACCOUNT_SELL:
        feePercentage = process.env.ACCOUNT_SELL;
        break;
      case TransactionTypeFee.BUY_XRP:
        feePercentage = process.env.BUY_XRP;
      case TransactionTypeFee.SWAP:
        feePercentage = process.env.SWAP;
        break;
      case TransactionTypeFee.RETAIL:
        feePercentage = process.env.RETAIL;
        break;
      default:
        throw new BadRequestResponse(`Invalid Transaction Type`).send(res);
    }

    switch (lnLevel) {
      case levelEnum.ACCOUNT:
        fee = (amount * parseFloat(feePercentage)) / 100;
        break;
      case levelEnum.WALLET:
        fee = (amount * parseFloat(feePercentage)) / 100;
        break;
      default:
        throw new BadRequestResponse(`Invalid level`).send(res);
    }

    const amountToTransact = amount - fee;

    return { fee, amountToTransact, feePercentage: parseFloat(feePercentage) };
  }

  public static async getAllForSingleAccount(accountId: Types.ObjectId) {
    const account = await Account.findById(accountId);

    const transactions = account.transactions;

    return transactions;
  }

  public static async getAllMonthlyTransactions(res: Response) {
    try {
      const transactions = await Transaction.aggregate([
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
            transactions: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: { $dateFromString: { dateString: "$_id" } },
            transactions: 1,
          },
        },
        {
          $sort: { date: 1 },
        },
      ]);

      return transactions;
    } catch (error) {
      throw new InternalErrorResponse(`Something went wrong`).send(res);
    }
  }

  public static async getAllWeeklyTransactions(
    startDate: Date,
    endDate: Date,
    res: Response
  ) {
    try {
      const transactions = await Transaction.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: null,
            transactions: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            startDate: {
              $dateToString: { format: "%d/%m/%Y", date: startDate },
            },
            endDate: { $dateToString: { format: "%d/%m/%Y", date: endDate } },
            transactions: 1,
          },
        },
      ]);
      return transactions;
    } catch (error) {
      throw new InternalErrorResponse(`Something went wrong`).send(res);
    }
  }

  public static async getSingle(transactionId: Types.ObjectId) {
    const transaction = await Transaction.findById(transactionId);

    return transaction;
  }

  public static async getRecipientTag(
    isRecepientEmail: boolean,
    recipient: string,
    res: Response
  ) {
    let tag: any;

    if (isRecepientEmail) {
      const wallet = await WalletService.getSingleByEmail(recipient);

      if (wallet) {
        const recipientVault = await Vault.findOne({ Wallet: wallet._id });

        if (!recipientVault) {
          throw new BadRequestResponse(`can not find recipient vault`).send(
            res
          );
        }
        tag = recipientVault.tag;
      } else {
        tag = 0;
      }

      return tag;
    }

    if (recipient[0].toLowerCase() === "x" && !isRecepientEmail) {
      tag = Decode(recipient).tag;
      return tag;
    }

    tag = parseInt(recipient);

    return tag;
  }

  public static async endTransfer(
    senderVaultAddress: string,
    tag: string,
    transaction: any,
    SupportedCurrencyId: string,
    currency: string,
    amountToTransact: number,
    res: Response,
    isRecepientEmail: boolean,
    fee: number,
    rate: number,
    senderId: string,
    originalAmount: number,
    senderEmail?: string,
    senderName?: string
  ) {
    const receiverVault = await Vault.findOne({
      tag: parseInt(tag),
    });

    if (!receiverVault) {
      throw new BadRequestResponse(`can not find receiver vault`).send(res);
    }

    const receiverWalletData = await WalletService.getSingle(
      receiverVault.Wallet
    );

    if (!receiverWalletData) {
      throw new BadRequestResponse(`can not find this receiver`).send(res);
    }

    if (receiverWalletData.isBanned === true) {
      throw new BadRequestResponse(
        `Account with id ${receiverWalletData._id} is banned`
      ).send(res);
    }

    const receiverAsset = await VaultAsset.findOne({
      vault: receiverVault,
      SupportedCurrencyId,
    });

    if (!receiverAsset) {
      await VaultAsset.create({
        vault: receiverVault._id,
        SupportedCurrency: SupportedCurrencyId,
        balance: amountToTransact,
      });
    }

    if (receiverAsset) {
      await receiverAsset?.updateOne({
        balance: receiverAsset.balance + amountToTransact,
      });
    }

    await transaction?.updateOne({
      status: TransactionStatus.SUCCESS,
      receiverId: receiverVault.Wallet,
      receiverAddress: receiverVault.address,
      recepientMoxId: parseInt(tag),
    });

    if (isRecepientEmail || receiverWalletData.email) {
      const transactions: IIattachmentTransaction[] = [
        {
          transaction: `Received ${currency} ${amountToTransact}`,
          sender: senderName ?? senderEmail ?? senderVaultAddress,
          receiver:
            receiverWalletData.name ??
            receiverWalletData.email ??
            receiverVault.address,
          originalAmount: `${currency} ${originalAmount}`,
          fee: `${currency} ${fee}`,
          proccesseAmount: `${currency} ${amountToTransact}`,
        },
      ];
      await createReceipt(
        receiverWalletData.name ??
          receiverWalletData.email ??
          receiverVault.address,
        receiverVault.address,
        tag ?? receiverWalletData._id,
        `${__dirname}/${transaction._id.toString()}.pdf`,
        transactions,
        transaction._id.toString(),
        TransactionStatus.SUCCESS
      );

      await WalletService.sendEmailToCustodialWallet(
        {
          email: receiverWalletData.email as string,
          data: {
            amount: `${currency} ${amountToTransact}`,
            sender: senderName ?? senderEmail ?? senderVaultAddress,
            reference: transaction._id,
          },
        },
        process.env.FUNDS_RECEIVED as string,
        "You have received funds in your mox wallet",
        `${transaction._id.toString()}.pdf`
      );
    }

    if (senderEmail) {
      const transactions: IIattachmentTransaction[] = [
        {
          transaction: `Sent ${currency} ${amountToTransact}`,
          sender: senderName ?? senderEmail ?? senderVaultAddress,
          receiver:
            receiverWalletData.name ??
            receiverWalletData.email ??
            receiverVault.address,
          originalAmount: `${currency} ${originalAmount}`,
          fee: `${currency} ${fee}`,
          proccesseAmount: `${currency} ${amountToTransact}`,
        },
      ];

      await createReceipt(
        senderName ?? senderEmail ?? senderVaultAddress,
        senderVaultAddress,
        tag ?? "",
        `${__dirname}/${transaction._id.toString()}.pdf`,
        transactions,
        transaction._id.toString(),
        TransactionStatus.SUCCESS
      );

      await WalletService.sendEmailToCustodialWallet(
        {
          email: senderEmail,
          data: {
            amount: `${currency} ${amountToTransact}`,
            sender: senderName ?? senderEmail ?? senderVaultAddress,
            time: moment(transaction.createdAt).format("MMM Do YY"),
            fee,
            rate,
            originalAmount,
            reference: transaction._id.toString(),
          },
        },
        process.env.SUCCESS_TRANSACTION as string,
        "Successful transaction",
        `${transaction._id.toString()}.pdf`
      );
    }

    if (receiverWalletData.enableNotification) {
      const sender = senderName ?? senderEmail ?? senderVaultAddress;
      const receiver =
        receiverWalletData.name ??
        receiverWalletData.email ??
        receiverVault.address;
      PusherService.triggerEvent(
        receiverWalletData?.notificationToken as string,
        `you have received ${amountToTransact} ${currency}`,
        {
          sender,
          message: `you have received ${amountToTransact} ${currency} from ${sender}`,
          receiver: receiver,
          createdAt: transaction.createdAt,
        }
      );
    }

    const receiverTransactions = receiverVault.transactions;
    await receiverVault.updateOne({
      transactions: [...receiverTransactions, transaction._id],
    });

    await NotificationService.addNotification(
      receiverVault.Wallet.toString(),
      `You have received ${amountToTransact} ${currency}`,
      `${senderVaultAddress} sent ${amountToTransact} ${currency} to your wallet`
    );

    const newTransaction = await Transaction.findById(transaction._id);

    PusherService.triggerPusherEvent(
      senderId,
      PusherEvent.TRANSACTIONS_UPDATED,
      newTransaction
    );

    PusherService.triggerPusherEvent(
      receiverWalletData._id.toString(),
      PusherEvent.TRANSACTIONS_UPDATED,
      newTransaction
    );
  }

  public static async walletSendXrpTokens(
    walletId: Types.ObjectId,
    recipient: any,
    amount: string,
    currency: string,
    res: Response,
    reason: string
  ) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const isRecepientEmail = emailRegex.test(recipient);

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
      throw new BadRequestResponse(`admin account could not be found`).send(
        res
      );
    }

    const currentWallet = await WalletService.getSingle(walletId);

    if (!currentWallet) {
      throw new BadRequestResponse(`can not find this wallet`).send(res);
    }

    if (currentWallet.isBanned === true) {
      throw new BadRequestResponse(`Wallet with id ${walletId} is banned`).send(
        res
      );
    }
    const SupportedCurrency = await SupportedCurrencyService.getSingleBySymbol(
      currency
    );

    if (!SupportedCurrency) {
      throw new BadRequestResponse("Currency type not supported").send(res);
    }

    const senderVault = await Vault.findOne({ Wallet: walletId });

    if (!senderVault) {
      throw new BadRequestResponse(`can not find wallet vault`).send(res);
    }

    if (senderVault.isGrandVault) {
      throw new BadRequestResponse(
        `operator can not send any direct payment`
      ).send(res);
    }

    const senderAsset = await VaultAsset.findOne({
      vault: senderVault,
      SupportedCurrency,
    });

    if (!senderAsset) {
      throw new BadRequestResponse(`Sender has no ${currency} currency`).send(
        res
      );
    }

    if (senderAsset.balance < parseFloat(amount)) {
      throw new BadRequestResponse(`Insufficient funds`).send(res);
    }

    const senderTag: any = Decode(senderVault.address).tag;

    const grandVault: any = await Vault.findOne({
      isGrandVault: true,
      Wallet: operatorAccount.walletId,
    }).populate("account");

    if (!grandVault) {
      throw new BadRequestResponse(`can not find wallet vault`).send(res);
    }

    const grandVaultX: any = Decode(grandVault.address);

    let transaction: any;

    if (
      !(
        recipient[0].toLowerCase() === "x" ||
        isRecepientEmail ||
        !isNaN(recipient)
      ) &&
      !(recipient[0].toLowerCase() === "r" && !isRecepientEmail)
    ) {
      throw new BadRequestResponse(`Invalid Recepient`).send(res);
    }

    if (
      recipient[0].toLowerCase() === "x" ||
      isRecepientEmail ||
      !isNaN(recipient)
    ) {
      const tag = await this.getRecipientTag(isRecepientEmail, recipient, res);

      if (senderTag === tag) {
        throw new BadRequestResponse(
          `can not send funds to your own account`
        ).send(res);
      }

      if (parseInt(tag) === grandVault.tag) {
        throw new BadRequestResponse(`can not send funds to operator`).send(
          res
        );
      }

      const fees = await this.getFees(
        levelEnum.WALLET,
        parseFloat(amount),
        TransactionTypeFee.WALLET_TO_WALLET_TRANSFER,
        res
      );

      transaction = await Transaction.create({
        senderId: walletId,
        senderMoxId: parseInt(senderTag),
        amount: parseFloat(amount),
        senderAddress: senderVault.address,
        status: TransactionStatus.PENDING,
        receiverEmail: isRecepientEmail ? recipient : "",
        type: TransactionType.OTHER,
        currency: currency,
        reason,
      });

      await senderAsset?.updateOne({
        balance: senderAsset.balance - parseFloat(amount),
      });
      const transactions = senderVault.transactions;
      await senderVault.updateOne({
        transactions: [...transactions, transaction._id],
      });

      console.log(tag);

      if (tag !== 0) {
        await this.endTransfer(
          senderVault.address,
          tag,
          transaction,
          SupportedCurrency._id.toString(),
          currency,
          fees.amountToTransact,
          res,
          isRecepientEmail,
          fees.fee,
          fees.feePercentage,
          currentWallet._id.toString(),
          parseFloat(amount),
          currentWallet.email,
          currentWallet.name
        );
      } else {
        await Cashes.create({
          transactionId: transaction._id,
          recipientEmail: recipient.toLowerCase(),
          level: levelEnum.WALLET,
        });
        const transactions: IIattachmentTransaction[] = [
          {
            transaction: `Received ${currency} ${fees.amountToTransact}}`,
            sender:
              currentWallet.name ?? currentWallet.email ?? senderVault.address,
            receiver: recipient,
            originalAmount: `${currency} ${parseFloat(amount)}`,
            fee: `${currency} ${fees.fee}`,
            proccesseAmount: `${currency} ${fees.amountToTransact}}`,
          },
        ];
        await createReceipt(
          recipient,
          "N/A",
          recipient,
          `${__dirname}/${transaction._id.toString()}.pdf`,
          transactions,
          transaction._id.toString(),
          TransactionStatus.SUCCESS
        );
        await WalletService.sendEmailToCustodialWallet(
          {
            email: recipient,
            data: {
              amount: `${currency} ${fees.amountToTransact}`,
              sender:
                currentWallet.name ??
                currentWallet.email ??
                senderVault.address,
              reference: transaction._id,
            },
          },
          process.env.NON_USERS as string,
          "You have received funds through MOX wallet",
          `${transaction._id.toString()}.pdf`
        );
        const newTransaction = await Transaction.findById(transaction._id);

        PusherService.triggerPusherEvent(
          currentWallet._id.toString(),
          PusherEvent.TRANSACTIONS_UPDATED,
          newTransaction
        );
      }
      const adminsTransactions = operatorAccount.transactions;

      await operatorAccount.updateOne({
        transactions: [...adminsTransactions, transaction._id],
      });
      await NotificationService.addNotification(
        walletId.toString(),
        `You have sent ${fees.amountToTransact} ${currency}`,
        `${senderVault.address} sent ${fees.amountToTransact} ${currency} to ${recipient}`
      );
    }

    if (recipient[0].toLowerCase() === "r" && !isRecepientEmail) {
      const receiverAccount = await Account.findOne({
        address: recipient,
      })
        .select("+secret")
        .fill("balance")
        .fill("assets");

      if (!receiverAccount) {
        throw new BadRequestResponse(
          `can not find account with xrp address ${recipient}`
        ).send(res);
      }

      const receiverWalletData = await WalletService.getSingle(
        receiverAccount.walletId
      );

      if (!receiverWalletData) {
        throw new BadRequestResponse(`can not find this receiver`).send(res);
      }

      if (receiverWalletData.isBanned === true) {
        throw new BadRequestResponse(
          `Account with id ${receiverWalletData._id} is banned`
        ).send(res);
      }

      const fees = await this.getFees(
        levelEnum.WALLET,
        parseFloat(amount),
        TransactionTypeFee.WALLET_TO_ACCOUNT_TRANSFER,
        res
      );

      transaction = await Transaction.create({
        senderId: walletId,
        senderMoxId: parseInt(senderTag),
        amount: fees.amountToTransact,
        receiverId: receiverAccount.walletId,
        receiverAccount: receiverAccount._id,
        receiverAddress: recipient,
        senderAddress: senderVault.address,
        status: TransactionStatus.PENDING,
        type: TransactionType.OTHER,
        currency: currency,
        reason,
      });

      if (senderAsset.balance < parseFloat(amount)) {
        await transaction?.updateOne({
          status: TransactionStatus.FAILED,
          errorMessage: "Insufficient funds",
        });
        throw new BadRequestResponse(`Insufficient funds`).send(res);
      }

      const grandVaultSecret = await Account.findById(
        grandVault.account._id
      ).select("+secret");

      const tx: any = await RippleService.sendCurrecy(
        res,
        receiverAccount.secret,
        grandVaultSecret.secret,
        receiverAccount?.address,
        currency,
        fees.amountToTransact,
        transaction,
        parseInt(grandVaultX.tag)
      );

      const txSuccess = tx?.result.meta.TransactionResult == "tesSUCCESS";

      if (txSuccess) {
        await senderAsset?.updateOne({
          balance: senderAsset.balance - parseFloat(amount),
        });
      }

      await transaction?.updateOne({
        hashLink: this.formatHashLink(tx?.result?.hash) ?? "",
        status:
          tx?.result.meta.TransactionResult !== "tesSUCCESS" ||
          !tx?.result?.hash
            ? TransactionStatus.FAILED
            : TransactionStatus.SUCCESS,
      });

      const adminsTransactions = operatorAccount.transactions;

      await operatorAccount.updateOne({
        transactions: [...adminsTransactions, transaction._id],
      });

      const transactions = senderVault.transactions;
      const receiverTransactions = receiverAccount.transactions;

      await senderVault.updateOne({
        transactions: [...transactions, transaction._id],
      });

      await receiverAccount.updateOne({
        transactions: [...receiverTransactions, transaction._id],
      });

      if (txSuccess) {
        await NotificationService.addNotification(
          walletId.toString(),
          `You have sent ${fees.amountToTransact} ${currency}`,
          `${senderVault.address} sent ${fees.amountToTransact} ${currency} to ${recipient}`
        );
        if (currentWallet.email) {
          const transactions: IIattachmentTransaction[] = [
            {
              transaction: `Bought ${SupportedCurrency.symbol} ${amount}`,
              sender: "hello@moxwallet.io",
              receiver: currentWallet.email,
              originalAmount: `${SupportedCurrency.symbol} ${amount}`,
              fee: `${SupportedCurrency.symbol} ${fees.fee}`,
              proccesseAmount: `${SupportedCurrency.symbol} ${amount}`,
            },
          ];

          await createReceipt(
            currentWallet.email,
            "N/A",
            process.env.OPERATOR_WALLET_ID ?? "",
            `${__dirname}/${transaction._id.toString()}.pdf`,
            transactions,
            transaction._id.toString(),
            TransactionStatus.SUCCESS
          );
          await WalletService.sendEmailToCustodialWallet(
            {
              email: currentWallet.email,
              data: {
                amount: `${currency} ${fees.amountToTransact}`,
                sender:
                  currentWallet.name ??
                  currentWallet.email ??
                  senderVault.address,
                time: moment(transaction.createdAt).format("MMM Do YY"),
                fee: fees.fee,
                rate: `${fees.feePercentage}%`,
                originalAmount: amount,
                reference: transaction._id,
              },
            },
            process.env.SUCCESS_TRANSACTION as string,
            "Successful transaction",
            `${transaction._id.toString()}.pdf`
          );
        }
      } else {
        await NotificationService.addNotification(
          walletId.toString(),
          `Transaction of ${fees.amountToTransact} ${currency} Failed`,
          `Failed to send ${fees.amountToTransact} ${currency} to ${recipient}`
        );
        if (currentWallet.email) {
          await WalletService.sendEmailToCustodialWallet(
            {
              email: currentWallet.email as string,
              data: {
                amount: `${currency} ${amount}`,
                sender:
                  currentWallet.name ??
                  currentWallet.email ??
                  senderVault.address,
                reference: transaction._id,
              },
            },
            process.env.FAILED_TRANSACTION as string,
            "Mox Transaction Failed"
          );
        }
      }
      const newTransaction = await Transaction.findById(transaction._id);

      PusherService.triggerPusherEvent(
        receiverWalletData._id.toString(),
        PusherEvent.TRANSACTIONS_UPDATED,
        newTransaction
      );
      PusherService.triggerPusherEvent(
        currentWallet._id.toString(),
        PusherEvent.TRANSACTIONS_UPDATED,
        newTransaction
      );
    }

    const newTransaction = await Transaction.findById(transaction?._id);

    return transaction?._id ? newTransaction : {};
  }

  public static async accountSendXRPTokens(
    walletId: Types.ObjectId,
    accountId: Types.ObjectId,
    recipientAddress: string,
    amount: string,
    currency: string,
    res: Response,
    reason: string
  ) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const isRecepientEmail = emailRegex.test(recipientAddress);
    if (!process.env.ISSUER_ADDRESS) {
      throw new BadRequestResponse(`issuer address can not be found`).send(res);
    }
    const account = await Account.findOne({
      _id: accountId,
      walletId,
    })
      .select("+secret")
      .fill("balance")
      .fill("assets");

    if (!account) {
      throw new BadRequestResponse("Sender Account not found").send(res);
    }

    const operatorAccount: AccountDocument | null = await Account.findById(
      process.env.OPERATOR_WALLET_ID
    )
      .select("+secret")
      .fill("balance")
      .fill("assets");

    if (!operatorAccount) {
      throw new BadRequestResponse(`admin account could not be found`).send(
        res
      );
    }

    if (
      currency === undefined &&
      parseFloat(account.balance) < parseFloat(amount)
    ) {
      throw new BadRequestResponse(
        `Insufficient funds in account ${account.address}`
      ).send(res);
    }

    const grandVault: any = await Vault.findOne({
      isGrandVault: true,
      Wallet: operatorAccount.walletId,
    }).populate("account");

    if (!grandVault) {
      throw new BadRequestResponse(`can not find wallet vault`).send(res);
    }

    const grandVaultX: any = Decode(grandVault.address);

    const SupportedCurrency = await SupportedCurrencyService.getSingleBySymbol(
      currency
    );

    if (!SupportedCurrency && currency != undefined) {
      throw new BadRequestResponse("Currency type not supported").send(res);
    }

    let toWallet =
      recipientAddress[0].toLowerCase() === "x" || isRecepientEmail;

    if (toWallet && currency === undefined) {
      throw new BadRequestResponse(`can not send Native XRP to wallet`).send(
        res
      );
    }

    if (account._id.toString() === operatorAccount._id.toString()) {
      throw new BadRequestResponse(
        `operator can not send any direct payment`
      ).send(res);
    }

    if (account.isBanned === true) {
      throw new BadRequestResponse(
        `Account with id ${accountId} is banned`
      ).send(res);
    }

    let receiver;
    let receiverExist = false;

    let transactionObject: any = {
      senderId: account.walletId,
      senderAccount: account._id,
      amount: parseFloat(amount),
      senderAddress: account.address,
      status: TransactionStatus.PENDING,
      type: currency ? TransactionType.OTHER : TransactionType.XRP,
      currency: currency ?? "XRP",
      reason,
    };

    if (!toWallet && !isRecepientEmail) {
      const receiverAccount = await Account.findOne({
        address: recipientAddress,
      })
        .select("+secret")
        .fill("balance")
        .fill("assets");

      if (!receiverAccount) {
        throw new BadRequestResponse(
          `can not find account with xrp address ${recipientAddress}`
        ).send(res);
      }

      if (account._id.toString() === receiverAccount._id.toString()) {
        throw new BadRequestResponse(
          `can not send funds to your own account`
        ).send(res);
      }
      if (receiverAccount._id.toString() === operatorAccount._id.toString()) {
        throw new BadRequestResponse(`can not send funds to operator`).send(
          res
        );
      }
      if (receiverAccount.isBanned === true) {
        throw new BadRequestResponse(`Receiver is banned`).send(res);
      }
      receiver = receiverAccount;
    } else {
      const tag = await this.getRecipientTag(
        isRecepientEmail,
        recipientAddress,
        res
      );

      if (tag !== 0) {
        receiverExist = true;
        if (parseInt(tag) === grandVault.tag) {
          throw new BadRequestResponse(`can not send funds to operator`).send(
            res
          );
        }

        const receiverVault = await Vault.findOne({
          tag: parseInt(tag),
        });

        if (!receiverVault) {
          throw new BadRequestResponse(`can not find receiver vault`).send(res);
        }

        const receiverWalletData = await WalletService.getSingle(
          receiverVault.Wallet
        );

        if (!receiverWalletData) {
          throw new BadRequestResponse(`can not find this receiver`).send(res);
        }

        if (receiverWalletData.isBanned === true) {
          throw new BadRequestResponse(
            `Wallet with id ${receiverWalletData._id} is banned`
          ).send(res);
        }

        let receiverAsset = await VaultAsset.findOne({
          vault: receiverVault,
          SupportedCurrency,
        });

        if (!receiverAsset && SupportedCurrency) {
          receiverAsset = await VaultAsset.create({
            vault: receiverVault._id,
            SupportedCurrency: SupportedCurrency._id,
            balance: 0,
          });
        }
        receiver = { receiverAsset, receiverVault, receiverWalletData };
      } else {
        receiver = undefined;
        receiverExist = false;
      }
    }

    let tx: any = {};

    const fees = await this.getFees(
      levelEnum.ACCOUNT,
      parseFloat(amount),
      !toWallet
        ? TransactionTypeFee.ACCOUNT_TO_ACCOUNT_TRANSFER
        : TransactionTypeFee.ACCOUNT_TO_WALLET_TRANSFER,
      res
    );

    if (!toWallet) {
      transactionObject.receiverId = receiver.walletId;
      transactionObject.receiverAccount = receiver._id;
      transactionObject.receiverAddress = recipientAddress;
    } else {
      if (receiverExist) {
        transactionObject.receiverId = receiver.receiverVault.Wallet;
        transactionObject.recepientMoxId = receiver.receiverVault.tag;
        transactionObject.receiverAddress = receiver.receiverVault.address;
      }
    }

    const transaction: any = await Transaction.create(transactionObject);

    if (currency === undefined && !toWallet) {
      tx = await RippleService.transferXRP(
        account.secret,
        amount,
        recipientAddress
      );
    }

    if (currency !== undefined) {
      const senderCurrencyBalance = account?.assets;
      if (!senderCurrencyBalance?.assets) {
        throw new BadRequestResponse(`Sender has no trustline currency`).send(
          res
        );
      }
      const senderBalance: any = senderCurrencyBalance?.assets[
        process.env.ISSUER_ADDRESS
      ].filter((each: any) => each.currency === currency);

      if (!senderBalance[0]?.value) {
        await transaction?.updateOne({
          status: TransactionStatus.FAILED,
          errorMessage: `Sender has 0 ${currency}`,
        });
        throw new BadRequestResponse(`Sender has 0 ${currency}`).send(res);
      }

      if (parseFloat(senderBalance[0]?.value) < parseFloat(amount)) {
        await transaction?.updateOne({
          status: TransactionStatus.FAILED,
          errorMessage: "Insufficient funds",
        });
        throw new BadRequestResponse(`Insufficient funds`).send(res);
      }

      const grandVaultSecret = await Account.findById(
        grandVault.account._id
      ).select("+secret");

      const tx: any = await RippleService.sendCurrecy(
        res,
        !toWallet ? receiver.secret : grandVaultSecret.secret,
        account.secret,
        !toWallet ? receiver?.address : grandVault.account.address,
        currency,
        toWallet ? parseFloat(amount) : fees.amountToTransact,
        transaction,
        toWallet && parseFloat(grandVaultX.tag)
      );

      if (!toWallet) {
        await RippleService.sendCurrecy(
          res,
          grandVaultSecret.secret,
          account.secret,
          grandVault.account.address,
          currency,
          fees.fee,
          transaction,
          parseFloat(grandVaultX.tag)
        );
      }

      const txSucess = tx?.result.meta.TransactionResult == "tesSUCCESS";

      await transaction?.updateOne({
        hashLink: this.formatHashLink(tx?.result?.hash) ?? "",
        hash: tx?.result?.hash,
        status: !txSucess
          ? TransactionStatus.FAILED
          : receiverExist
          ? TransactionStatus.SUCCESS
          : TransactionStatus.PENDING,
      });

      const adminsTransactions = operatorAccount.transactions;

      await operatorAccount.updateOne({
        transactions: [...adminsTransactions, transaction._id],
      });

      if (txSucess && toWallet) {
        const transactions: IIattachmentTransaction[] = [
          {
            transaction: `Received ${currency} ${fees.amountToTransact}}`,
            sender: account.address,
            receiver: receiverExist
              ? receiver.receiverVault.address
              : recipientAddress.toLowerCase(),
            originalAmount: `${currency} ${parseFloat(amount)}`,
            fee: `${currency} ${fees.fee}`,
            proccesseAmount: `${currency} ${fees.amountToTransact}}`,
          },
        ];
        await createReceipt(
          receiverExist
            ? receiver.receiverWalletData.email
            : recipientAddress.toLowerCase(),
          "N/A",
          receiverExist
            ? receiver.receiverVault.address
            : recipientAddress.toLowerCase(),
          `${__dirname}/${transaction._id.toString()}.pdf`,
          transactions,
          transaction._id.toString(),
          TransactionStatus.SUCCESS
        );
        if (receiverExist) {
          await receiver.receiverAsset.updateOne({
            balance: receiver.receiverAsset.balance + fees.amountToTransact,
          });
          await WalletService.sendEmailToCustodialWallet(
            {
              email: receiver.receiverWalletData.email as string,
              data: {
                amount: `${currency} ${fees.amountToTransact}`,
                sender: account.address,
                reference: transaction._id,
              },
            },
            process.env.FUNDS_RECEIVED as string,
            "You have received funds in your mox wallet",
            `${transaction._id.toString()}.pdf`
          );
        }

        if (!receiverExist) {
          await WalletService.sendEmailToCustodialWallet(
            {
              email: recipientAddress.toLowerCase(),
              data: {
                amount: `${currency} ${fees.amountToTransact}`,
                sender: account.address,
                reference: transaction._id,
              },
            },
            process.env.NON_USERS as string,
            "You have received funds through MOX wallet",
            `${transaction._id.toString()}.pdf`
          );
        }
      }
    }

    const transactions = account.transactions;
    const receiverTransactions = !toWallet
      ? receiver.transactions
      : receiverExist
      ? receiver.receiverVault.transactions
      : undefined;

    await account.updateOne({
      transactions: [...transactions, transaction._id],
    });

    if (currency === undefined) {
      await transaction?.updateOne({
        hashLink: this.formatHashLink(tx?.result?.hash) ?? "",
        status:
          tx?.result.meta.TransactionResult !== "tesSUCCESS" ||
          !tx?.result?.hash
            ? TransactionStatus.FAILED
            : TransactionStatus.SUCCESS,
      });
    }

    const instance = !toWallet
      ? receiver
      : receiverExist
      ? receiver.receiverVault
      : undefined;

    if (instance) {
      await instance.updateOne({
        transactions: [...receiverTransactions, transaction._id],
      });
    }

    if (toWallet && !receiverExist) {
      await Cashes.create({
        transactionId: transaction._id,
        recipientEmail: recipientAddress.toLowerCase(),
        level: levelEnum.ACCOUNT,
      });
    }

    if (!toWallet || (toWallet && receiverExist)) {
      await NotificationService.addNotification(
        !toWallet ? receiver.walletId : receiver.receiverVault.Wallet,
        `You have sent ${fees.amountToTransact} ${currency}`,
        `${account.address} sent ${fees.amountToTransact} ${
          currency ?? "XRP"
        } to ${recipientAddress}`
      );
    }

    const newTransaction = await Transaction.findById(transaction._id);

    PusherService.triggerPusherEvent(
      !toWallet ? receiver?.walletId : receiver?.receiverVault?.Wallet,
      PusherEvent.TRANSACTIONS_UPDATED,
      newTransaction
    );

    PusherService.triggerPusherEvent(
      walletId?.toString(),
      PusherEvent.TRANSACTIONS_UPDATED,
      newTransaction
    );

    return newTransaction;
  }

  public static async transferNFToken(
    walletId: Types.ObjectId,
    accountId: Types.ObjectId,
    receiverAccount: any,
    tokenId: string,
    reason: string
  ) {
    const account = await Account.findOne({ _id: accountId, walletId }).select(
      "+secret"
    );
    if (!account) {
      throw new NotFoundError("Account not found");
    }

    if (account.address === receiverAccount.address) {
      throw new BadRequestError("Can not send NFT to your account");
    }

    const nfts: any = await RippleService.GetWalletNFTs(account.address);

    const initialOffer = await RippleService.transferOffers(tokenId);

    if (initialOffer && initialOffer.result.offers.length > 0) {
      throw new BadRequestError(
        `The token Id has already been sent to ${initialOffer.result.offers[0].destination}, cancel the transaction first before another sell offer`
      );
    }

    if (!nfts.find((each: any) => each.NFTokenID === tokenId)) {
      throw new BadRequestError("Account does not own this NFT");
    }

    const offers = await RippleService.transferNFToken(
      account.address,
      account.secret,
      tokenId,
      receiverAccount.address
    );

    if (offers) {
      const transaction: any = await Transaction.create({
        senderId: account.walletId,
        senderAccount: account._id,
        amount: 0,
        receiverId: receiverAccount && receiverAccount.walletId,
        receiverAccount: receiverAccount && receiverAccount._id,
        senderAddress: account.address,
        receiverAddress: receiverAccount.address,
        status: TransactionStatus.PENDING,
        type: TransactionType.NFT,
        NFTokenID: tokenId,
        reason,
      });

      const request = await TokenRequest.create({
        senderId: account.walletId,
        senderAccount: account._id,
        receiverId: receiverAccount && receiverAccount.walletId,
        receiverAccount: receiverAccount && receiverAccount._id,
        receiverAddress: offers.result.offers[0].destination,
        senderAddress: account.address,
        status: TokenRequestStatus.PENDING,
        NFTokenID: offers.result.nft_id,
        NFTokenOfferIndex: offers.result.offers[0].nft_offer_index,
        transactionId: transaction._id,
        nfts: nfts.find((each: any) => each.NFTokenID === tokenId),
        type: TokenRequestType.NFT,
      });

      const transactions = account.transactions;
      const receiverTransactions = receiverAccount.transactions;

      await account.updateOne({
        transactions: [...transactions, transaction._id],
      });

      await receiverAccount.updateOne({
        transactions: [...receiverTransactions, transaction._id],
      });

      return request;
    } else {
      throw new NotFoundError("NFT could not be transferred");
    }
  }

  public static async acceptNFTokenTransferRequest(
    nftRequestId: string,
    walletId: string,
    receiverAccount: any,
    senderAccount: any,
    senderId: any,
    transactionId: any,
    type: TokenRequestType,
    NftokenOfferIndex?: any
  ) {
    const receiver = await Account.findOne({
      _id: receiverAccount,
      walletId,
    }).select("+secret");

    if (!receiver) {
      throw new NotFoundError(
        `Account with id ${receiverAccount} does not exist`
      );
    }

    const sender = await Account.findOne({
      _id: senderAccount,
      walletId: senderId,
    }).select("+secret");

    if (!sender) {
      throw new NotFoundError(
        `Account with id ${senderAccount} does not exist`
      );
    }

    const transaction: any = await this.getSingle(transactionId);
    let tx: any = {};

    if (!transaction) {
      throw new NotFoundError(`transaction with id ${transactionId} not found`);
    }

    if (type === TokenRequestType.NFT && NftokenOfferIndex) {
      tx = await RippleService.NFTokenTransferRequest(
        receiver.secret,
        NftokenOfferIndex
      );
    }

    await TokenRequest.updateOne(
      { _id: nftRequestId },
      {
        $set: {
          status: TokenRequestStatus.ACCEPTED,
        },
      }
    );

    await Transaction.updateOne(
      { _id: transactionId },
      {
        $set: {
          status: TransactionStatus.SUCCESS,
          hashLink: this.formatHashLink(tx?.result?.hash) ?? "",
        },
      }
    );

    return transaction;
  }

  public static async rejectNFTokenTransferRequest(
    nftRequestId: string,
    senderId: any,
    senderAccount: any,
    transactionId: any
  ) {
    const sender = await Account.findOne({
      _id: senderAccount,
      walletId: senderId,
    }).select("+secret");

    if (!sender) {
      throw new NotFoundError(
        `Account with id ${senderAccount} does not exist`
      );
    }

    await TokenRequest.updateOne(
      { _id: nftRequestId },
      {
        $set: {
          status: TokenRequestStatus.REJECTED,
        },
      }
    );

    await Transaction.updateOne(
      { _id: transactionId },
      {
        $set: {
          status: TransactionStatus.FAILED,
        },
      }
    );

    return await this.getSingle(transactionId);
  }

  public static async deleteSingle(id: Types.ObjectId) {
    return await Transaction.findByIdAndDelete(id);
  }
}

export default TransactionService;
