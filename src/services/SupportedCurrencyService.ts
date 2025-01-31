import SupportedCurrency, {
  SupportedCurrenciesDocument,
} from "../api/database/models/supportedCurrencies";
import { Types } from "mongoose";
import { IUpdateSupportedCurrency } from "../api/controllers/supportedCurrencies";
import { Request, Response } from "express";
import Transaction, {
  TransactionDocument,
  TransactionStatus,
  TransactionType,
} from "../api/database/models/transaction.model";
import Account, { AccountDocument } from "../api/database/models/account.model";
import { BadRequestResponse, NotFoundResponse } from "../core/ApiResponse";
import Wallet from "./wallet_service";
import PusherService, { PusherEvent } from "./pusher";
import ripple from "mox-ripple";
import Distribution from "../api/database/models/distribution.model";
import TransactionService from "./transaction_service";
import { dataUri } from "../lib/multer";
import { fileUpload } from "../helpers/upload";
import { environment, issuerAddress, rippleNetwork } from "../config";
import { levelEnum } from "../api/database/models/trade.model";
const CC = require("currency-converter-lt");
import * as xrpl from "xrpl";
import Vault from "../api/database/models/vault.model";
import VaultAsset, {
  VaultAssetDocument,
} from "../api/database/models/vaultAsset.model";
import VaultService from "./vault.service";
import CoinGecko from "coingecko-api";
const coinGeckoClient = new CoinGecko();
import PaginationService from "./paginate";
import https from "https";
import WalletService from "./wallet_service";
import NotificationService from "./notification_service";
import moment from "moment";
import { IIattachmentTransaction, createReceipt } from "./pdfGenerator";

const RippleService = new ripple(
  rippleNetwork,
  environment as string,
  issuerAddress as string
);

class SupportedCurrencyService {
  public static async getAll() {
    const SupportedCurrencys = await SupportedCurrency.find().sort({
      createdAt: -1,
    });
    return SupportedCurrencys;
  }

  public static async getSingle(SupportedCurrencyId: Types.ObjectId) {
    const supportedCurrency = await SupportedCurrency.findById(
      SupportedCurrencyId
    );
    return supportedCurrency;
  }

  public static async getSingleBySymbol(symbol: string) {
    const supportedCurrency = await SupportedCurrency.findOne({ symbol });
    return supportedCurrency;
  }

  public static async addSupportedCurrency(
    name: string,
    symbol: string,
    supply: number,
    image: string,
    code: string,
    req: Request
  ) {
    let url = "";
    if (req.file) {
      const file = dataUri(req.file!);
      const options = {
        folder: `${req.wallet!._id}/media`,
        resource_type: "image",
        timeout: 600000,
      };

      try {
        const upload = await fileUpload(file, options);
        url = upload.url;
      } catch (error) {
        throw new Error("Unable upload file");
      }
    }
    let supportedCurrency = await new SupportedCurrency({
      name,
      symbol,
      supply,
      image: url,
      code,
    }).save();
    return supportedCurrency;
  }

  public static async deleteSupportedCurrency(id: string): Promise<any> {
    return await SupportedCurrency.findByIdAndDelete(id);
  }

  public static async updateSupportedCurrency(
    id: Types.ObjectId,
    data: IUpdateSupportedCurrency,
    req: Request
  ) {
    let url = "";
    if (req.file) {
      const file = dataUri(req.file!);
      const options = {
        folder: `${req.wallet!._id}/media`,
        resource_type: "image",
        timeout: 600000,
      };

      try {
        const upload = await fileUpload(file, options);
        url = upload.url;
        data.image = url;
      } catch (error) {
        throw new Error("Unable upload file");
      }
    }
    await SupportedCurrency.findByIdAndUpdate(id, data);

    return await this.getSingle(id);
  }

  public static async distributeCurrency(
    walletId: string,
    senderAccount: AccountDocument,
    amount: number,
    SupportedCurrency: SupportedCurrenciesDocument,
    res: Response,
    level: levelEnum,
    reason: string,
    xrpTransaction: boolean,
    fee: number,
    originalAmount: number,
    rate: number,
    receiverAccount?: AccountDocument
  ) {
    const distribution = await Distribution.create({
      accountId: receiverAccount && receiverAccount._id,
      adminAccountId: senderAccount._id,
      currency: SupportedCurrency._id,
      amount,
    });

    let transaction: any;
    let tx: any;

    const wallet = await WalletService.getSingle(walletId);

    if (!wallet) {
      return new BadRequestResponse("can not find this wallet").send(res);
    }

    if (level === levelEnum.ACCOUNT) {
      if (!receiverAccount) {
        return new BadRequestResponse("can not find reciver account").send(res);
      }

      transaction = await Transaction.create({
        senderId: senderAccount.walletId,
        senderAccount: senderAccount._id,
        amount: amount,
        receiverId: walletId,
        receiverAccount: receiverAccount._id,
        receiverAddress: receiverAccount.address,
        senderAddress: senderAccount.address,
        status: TransactionStatus.PENDING,
        type: TransactionType.BUY,
        currency: SupportedCurrency.symbol,
        reason,
      });
      if (xrpTransaction) {
        tx = await RippleService.transferXRP(
          senderAccount.secret,
          amount.toString(),
          receiverAccount?.address as string
        );
      } else {
        tx = await RippleService.sendCurrecy(
          res,
          receiverAccount.secret,
          senderAccount.secret,
          receiverAccount?.address,
          SupportedCurrency.symbol,
          amount,
          transaction,
          distribution
        );
      }

      const txSuccess = tx?.result.meta.TransactionResult == "tesSUCCESS";

      const senderDistributions = senderAccount.distributions;
      const receiverDistributions = receiverAccount.distributions;

      const transactions = senderAccount.transactions;
      const receiverTransactions = receiverAccount.transactions;

      await senderAccount.updateOne({
        transactions: [...transactions, transaction._id],
        distributions: !txSuccess
          ? [...senderDistributions]
          : [...senderDistributions, distribution._id],
      });

      await receiverAccount.updateOne({
        transactions: [...receiverTransactions, transaction._id],
        distributions: !txSuccess
          ? [...receiverDistributions]
          : [...receiverDistributions, distribution._id],
      });

      const addedTx = await TransactionService.getSingle(transaction?.id);

      await addedTx?.updateOne({
        hashLink: TransactionService.formatHashLink(tx?.result?.hash) ?? "",
        status: txSuccess
          ? TransactionStatus.SUCCESS
          : TransactionStatus.FAILED,
      });
      if (txSuccess) {
        await SupportedCurrency.updateOne({
          suppliedTokens: SupportedCurrency.suppliedTokens + amount,
        });
        if (wallet.enableNotification) {
          const sender = "Mox";
          const receiver =
            wallet.name ?? wallet.email ?? receiverAccount.address;
          PusherService.triggerEvent(
            wallet?.notificationToken as string,
            `Currency purchase successful`,
            {
              sender,
              message: `you have purchased ${SupportedCurrency.symbol} ${amount}`,
              receiver: receiver,
              createdAt: transaction.createdAt,
            }
          );
        }
      } else {
        if (wallet.enableNotification) {
          const sender = "Mox";
          const receiver =
            wallet.name ?? wallet.email ?? receiverAccount?.address;
          PusherService.triggerEvent(
            wallet?.notificationToken as string,
            `Currency purchase failed`,
            {
              sender,
              message: `Failed to buy ${amount} of ${SupportedCurrency.symbol} currency`,
              receiver: receiver,
              createdAt: transaction.createdAt,
            }
          );
        }
      }
      const newTransaction = await Transaction.findById(transaction._id);

      PusherService.triggerPusherEvent(
        wallet._id.toString(),
        PusherEvent.TRANSACTIONS_UPDATED,
        newTransaction
      );
    }

    if (level === levelEnum.WALLET) {
      console.log("level account", level);
      const walletVault = await Vault.findOne({
        Wallet: walletId,
      });

      transaction = await Transaction.create({
        senderId: senderAccount.walletId,
        senderAccount: senderAccount._id,
        amount: amount,
        receiverId: walletId,
        recepientMoxId: walletVault?.tag,
        receiverAddress: walletVault?.address,
        senderAddress: senderAccount.address,
        status: TransactionStatus.PENDING,
        type: TransactionType.BUY,
        currency: SupportedCurrency.symbol,
        reason,
      });

      if (!walletVault) {
        await transaction.updateOne({
          status: TransactionStatus.FAILED,
          errorMessage: "could not find wallet vault",
        });
        return await TransactionService.getSingle(transaction.id);
      }

      const walletAssets = await VaultAsset.findOne({
        vault: walletVault._id,
        SupportedCurrency: SupportedCurrency._id,
      });

      if (!walletAssets) {
        await VaultAsset.create({
          vault: walletVault._id,
          SupportedCurrency: SupportedCurrency._id,
          balance: amount,
        });
      }

      const grandVault: any = await Vault.findOne({
        isGrandVault: true,
      }).populate("account");

      const grandVaultSecret = await Account.findById(
        grandVault.account._id
      ).select("+secret");

      if (!grandVault) {
        await transaction.updateOne({
          status: TransactionStatus.FAILED,
          errorMessage: "could not find grand vault",
        });
        return await TransactionService.getSingle(transaction.id);
      }

      await walletVault.updateOne({
        transactions: [...walletVault.transactions, transaction._id],
      });

      await grandVault.updateOne({
        transactions: [...grandVault.transactions, transaction._id],
      });

      const tx: any = await RippleService.sendCurrecy(
        res,
        grandVaultSecret.secret,
        senderAccount.secret,
        grandVault?.account.address,
        SupportedCurrency.symbol,
        amount,
        transaction,
        distribution,
        walletVault.tag
      );

      const txSuccess = tx?.result.meta.TransactionResult == "tesSUCCESS";

      if (txSuccess && walletAssets) {
        await walletAssets?.updateOne({
          balance: walletAssets.balance + amount,
        });
      }
      const receiverWallet = await WalletService.getSingle(walletId);

      if (txSuccess) {
        if (receiverWallet && receiverWallet.email) {
          const transactions: IIattachmentTransaction[] = [
            {
              transaction: `Bought ${SupportedCurrency.symbol} ${amount}`,
              sender: receiverWallet.email,
              receiver: receiverWallet.email,
              originalAmount: `${SupportedCurrency.symbol} ${originalAmount}`,
              fee: `${fee}%`,
              proccesseAmount: `${SupportedCurrency.symbol} ${amount}`,
            },
          ];

          await createReceipt(
            receiverWallet.email,
            "N/A",
            process.env.OPERATOR_WALLET_ID ?? "",
            `${__dirname}/${transaction._id.toString()}.pdf`,
            transactions,
            transaction._id.toString(),
            TransactionStatus.SUCCESS
          );
          await WalletService.sendEmailToCustodialWallet(
            {
              email: receiverWallet.email as string,
              data: {
                amount: `${SupportedCurrency.symbol} ${amount}`,
                sender: receiverWallet.email,
                time: moment(transaction.createdAt).format("MMM Do YY"),
                fee,
                rate,
                originalAmount,
                reference: transaction._id.toString(),
              },
            },
            process.env.SUCCESS_TRANSACTION as string,
            "Successful Mox transaction",
            `${transaction._id.toString()}.pdf`
          );
        }

        if (wallet.enableNotification) {
          const sender = "Mox";
          const receiver = wallet.name ?? wallet.email ?? walletVault?.address;
          PusherService.triggerEvent(
            wallet?.notificationToken as string,
            `Currency purchase successful`,
            {
              sender,
              message: `you have purchased ${SupportedCurrency.symbol} ${amount}`,
              receiver: receiver,
              createdAt: transaction.createdAt,
            }
          );
        }
      } else {
        await NotificationService.addNotification(
          walletId.toString(),
          `Transaction of ${amount} ${SupportedCurrency.symbol} Failed`,
          `Failed to buy ${amount} of ${SupportedCurrency.symbol} currency`
        );
        if (receiverWallet && receiverWallet.email) {
          await WalletService.sendEmailToCustodialWallet(
            {
              email: receiverWallet.email as string,
              data: {
                amount: `${SupportedCurrency.symbol} ${amount}`,
                sender:
                  receiverWallet.name ??
                  receiverWallet.email ??
                  walletVault?.address,
                reference: transaction._id,
              },
            },
            process.env.FAILED_TRANSACTION as string,
            "Mox Transaction Failed"
          );
        }
        if (wallet.enableNotification) {
          const sender = "Mox";
          const receiver = wallet.name ?? wallet.email ?? walletVault?.address;
          PusherService.triggerEvent(
            wallet?.notificationToken as string,
            `Currency purchase failed`,
            {
              sender,
              message: `Failed to buy ${amount} of ${SupportedCurrency.symbol} currency`,
              receiver: receiver,
              createdAt: transaction.createdAt,
            }
          );
        }
      }

      const addedTx = await TransactionService.getSingle(transaction?.id);

      await addedTx?.updateOne({
        hashLink: TransactionService.formatHashLink(tx?.result?.hash) ?? "",
        status: txSuccess
          ? TransactionStatus.SUCCESS
          : TransactionStatus.FAILED,
      });

      if (txSuccess) {
        await SupportedCurrency.updateOne({
          suppliedTokens: SupportedCurrency.suppliedTokens + amount,
        });
      }
      const newTransaction = await Transaction.findById(transaction._id);

      PusherService.triggerPusherEvent(
        wallet._id.toString(),
        PusherEvent.TRANSACTIONS_UPDATED,
        newTransaction
      );
    }

    return transaction;
  }

  public static async fetchForex(from: string, to: string) {
    return new Promise((resolve, reject) => {
      https
        .get(
          `https://api.fastforex.io/fetch-one?from=${from}&to=${to}&api_key=${process.env.FAST_FOREX_API_KEY}`,
          (resp) => {
            let data = "";

            resp.on("data", (chunk) => {
              data += chunk;
            });

            resp.on("end", () => {
              try {
                const parsedData = JSON.parse(data);
                resolve(parsedData);
              } catch (error) {
                reject(error);
              }
            });
          }
        )
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  public static async convertGHSCurrencyToUSD(currency: string, amount: number) {
    const charge = 15
    return amount/charge;
  }

  public static async convertCurrencyToUSD(currency: string, amount: number) {
    const rate: any = await this.fetchForex(currency, "USD");
    const charge = rate.result["USD"];

    return charge * amount;
  }

  public static async convertUSDToXRP(amount: number) {
    try {
      const coinData = await coinGeckoClient.coins.fetch("ripple", {});
      const xrpPriceUSD = coinData.data.market_data.current_price.usd;

      const xrpAmount = amount / xrpPriceUSD;

      return xrpAmount;
    } catch (error) {
      console.log(error);
      return 0;
    }
  }

  public static async convertXrpToUsd(amount: number) {
    try {
      const data = await coinGeckoClient.simple.price({
        ids: ["ripple"],
        vs_currencies: ["usd"],
      });

      if (data.success) {
        const conversionRate = data.data.ripple.usd;
        const convertedAmount = amount * conversionRate;
        return convertedAmount;
      } else {
        console.log("Failed to fetch conversion rate.");
        return 0;
      }
    } catch (error) {
      console.log(error);
      return 0;
    }
  }

  public static async convertCurrencyToNGN(from: string, amount: number) {
    const rate: any = await this.fetchForex(from, "NGN");
    const charge = rate.result["NGN"];

    return charge * amount;
  }

  public static async convertRate(from: string, to: string) {
    const rate: any = await this.fetchForex(from, to);
    const charge = rate.result[to];

    return charge;
  }

  // public static async getAllCurrencyTransactionsPaginated(
  //   query: Request["query"],
  //   currency: string,
  //   level: string,
  //   walletMoxId: string,
  //   walletAccountId: string
  // ) {
  //   const transactions = await PaginationService.paginateAggregate(
  //     query,
  //     Transaction,
  //     [
  //       {
  //         $match: { $or: [{ currency }, { toCurrency: currency }] },
  //       },
  //       {
  //         $match: {
  //           $or:
  //             level === "ACCOUNT"
  //               ? [
  //                   { senderAccount: walletAccountId },
  //                   { receiverAccount: walletAccountId },
  //                 ]
  //               : [{ senderMoxId: walletMoxId }, { recepientMoxId: walletMoxId }],
  //         },
  //       },

  //       { $sort: { createdAt: -1 } },
  //     ]
  //   );
  //   return transactions;
  // }
}

export default SupportedCurrencyService;
