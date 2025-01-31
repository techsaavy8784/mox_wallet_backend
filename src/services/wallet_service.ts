import Wallet, {
  WalletDocument,
  WalletRole,
} from "../api/database/models/wallet.model";
import {
  DocumentDefinition,
  Types,
  LeanDocument,
  PipelineStage,
} from "mongoose";
import bcrypt from "bcrypt";
import {
  AuthFailureError,
  BadRequestDataError,
  BadRequestError,
  NotFoundError,
} from "../core/ApiError";
import TokenRequest from "../api/database/models/TokenRequests.model";
import Account, { AccountDocument } from "../api/database/models/account.model";
import {
  AccountType,
  IwalletProfileUpdate,
  grandVaultBalance,
  operatorBalance,
  operatorXRPBalance,
} from "../api/controllers/wallet";
import { Request, Response } from "express";
import { dataUri } from "../lib/multer";
import { fileUpload } from "../helpers/upload";
import Devices, { DevicesDocument } from "../api/database/models/devices.model";
import WalletDevices from "../api/database/models/WalletDevice.model";
import {
  BadRequestDataResponse,
  BadRequestResponse,
  NotFoundResponse,
} from "../core/ApiResponse";
import SupportedCurrencyService from "./SupportedCurrencyService";
import TransactionService, { TransactionTypeFee } from "./transaction_service";
import Stripe from "stripe";
import Trade, {
  PaymentGatewayType,
  TradeStatus,
  TradeType,
  levelEnum,
} from "../api/database/models/trade.model";
import { SupportedCurrenciesDocument } from "../api/database/models/supportedCurrencies";
import Transaction, {
  TransactionDocument,
  TransactionStatus,
  TransactionType,
} from "../api/database/models/transaction.model";
import PaymentCard, {
  CARD_TYPE,
  PaymentCardDocument,
} from "../api/database/models/paymentCard.mode";
import PaginationService from "./paginate";
import FlutterwaveService, { MobileMoneyType } from "./flutterwaveService";
import NotificationService from "./notification_service";
import PaystackService, {
  TransferRecipientType,
} from "./paystackService.service";
import ripple from "mox-ripple";
import { rippleNetwork, environment, issuerAddress, baseUrl } from "../config";
import Vault from "../api/database/models/vault.model";
import VaultAsset from "../api/database/models/vaultAsset.model";
import { Encode, Decode } from "xrpl-tagged-address-codec";
import WithdrawMethod, {
  WithdrawGateway,
  WithdrawMethodTypes,
} from "../api/database/models/WithdrawMethod.model";
import { PayoutService } from "./Payout.service";
import { IEmailOptions, sendEmail } from "./EmailService";
import AfricasTalkingService from "./africastalking.service";
import PusherService, { PusherEvent } from "./pusher";

interface EmailRequestOptions {
  email: string;
  data?: any;
}

const stripe = new Stripe(process.env.STRIPE_API_KEY as string, {
  apiVersion: "2020-08-27",
});

const RippleService = new ripple(
  rippleNetwork,
  environment as string,
  issuerAddress as string
);

class WalletService {
  static ZeroDecimal = [
    "BIF",
    "CLP",
    "DJF",
    "GNF",
    "JPY",
    "KMF",
    "KRW",
    "MGA",
    "PYG",
    "RWF",
    "UGX",
    "VND",
    "VUV",
    "XAF",
    "XOF",
    "XPF",
  ];
  static ignoreKeys = [
    "level",
    "page",
    "limit",
    "days",
    "from",
    "to",
    "direction",
    "accountId",
    "days",
  ];
  public static async getAll(query: Request["query"]) {
    let typeArray: AccountType[] | string[] = [
      AccountType.CUSTODIAL,
      AccountType.NON_CUSTODIAL,
    ];

    const predefinedValues: any = {
      accountType: typeArray,
    };

    const matchData: any = await this.aggregateArray(
      query,
      predefinedValues,
      this.ignoreKeys
    );

    const wallets = await PaginationService.paginateAggregate(query, Wallet, [
      ...matchData,
      { $sort: { createdAt: -1 } },
      {
        $project: {
          password: 0,
          enableNotification: 0,
          notificationToken: 0,
          account_recovery_words: 0,
        },
      },
    ]);

    return wallets;
  }

  public static isValidLevel(value: string, enumObject: any) {
    for (let key in enumObject) {
      if (enumObject[key] === value) {
        return true;
      }
    }
    return false;
  }

  public static async getAdmins(): Promise<WalletDocument[] | []> {
    return await Wallet.find({
      role: { $in: [WalletRole.ADMIN, WalletRole.SUPER_ADMIN] },
    })
      .sort({ createdAt: -1 })
      .populate("accounts");
  }

  public static async getRandomEmail() {
    return "random@email.com";
  }

  public static async getWalletNFTs(recipient: string) {
    let account;
    try {
      account = await Account.findOne({ address: recipient });

      if (!account) {
        throw new NotFoundError(
          `can not find account with address ${recipient}`
        );
      }
    } catch (e) {
      console.log(e);
    }

    return await RippleService.GetWalletNFTs(account.address);
  }

  public static async getAccountbalances(walletId: string, res: Response) {
    try {
      const accountVault = await Vault.findOne({ Wallet: walletId });
      let allBalances: any = [];
      let allInUSD: any = [];
      let totalInUSD: number = 0;

      if (!accountVault) {
        throw new BadRequestResponse(`Wallet vault not found not found`).send(
          res
        );
      }

      const accountAssets: any = await VaultAsset.find({
        vault: accountVault._id,
      })
        .populate("SupportedCurrency")
        .sort({ createdAt: -1 });

      const { tag, account }: any = Decode(accountVault.address);

      allInUSD = await Promise.all(
        accountAssets.map(async (each: any) => {
          let converted: number = 0;
          if (parseFloat(each.balance) > 0) {
            converted = await SupportedCurrencyService.convertCurrencyToUSD(
              each.SupportedCurrency.symbol,
              parseFloat(each.balance)
            );
          }

          totalInUSD += converted;
          return {
            currency: each.SupportedCurrency.symbol,
            value: converted,
          };
        })
      );

      allBalances = await Promise.all(
        accountAssets.map(async (each: any) => {
          const transactions =
            await TransactionService.getAllAccountCurrencyTransaction(
              tag,
              each.SupportedCurrency.symbol
            );
          return {
            image: each.SupportedCurrency?.image ?? null,
            name: each.SupportedCurrency?.name,
            _id: each.SupportedCurrency?._id,
            suppliedTokens: each.SupportedCurrency?.suppliedTokens,
            supply: each.SupportedCurrency?.supply,
            countryCode: each.SupportedCurrency?.code,
            createdAt: each.SupportedCurrency.createdAt,
            updatedAt: each.SupportedCurrency.updatedAt,
            allTransactions: transactions,
            balance: parseFloat(each.balance),
            symbol: each.SupportedCurrency.symbol,
          };
        })
      );

      const xrpCalculated =
        totalInUSD > 0
          ? await SupportedCurrencyService.convertUSDToXRP(totalInUSD)
          : 0;

      return {
        allBalances: await allBalances,
        allInUSD,
        totalInUSD,
        totalInXrp: xrpCalculated,
      };
    } catch (e) {
      console.log(e);
    }
  }

  public static async getWalletBalances(
    account: AccountDocument,
    res: Response,
    walletId: string
  ) {
    if (!process.env.ISSUER_ADDRESS) {
      throw new BadRequestResponse(`Issuer address not found`).send(res);
    }

    const balances = account?.assets;
    let allBalances: any = [];
    let allInUSD: any = [];
    let totalInUSD: number = 0;

    const xrpBalance = [
      {
        currency: "XRP",
        value: account.balance ?? "0.0",
      },
    ];
    const currencies = balances?.assets
      ? balances?.assets[process.env.ISSUER_ADDRESS].concat(xrpBalance)
      : xrpBalance;
    allInUSD = await Promise.all(
      currencies.map(async (each: any) => {
        let converted: number = 0;
        if (parseFloat(each.value) > 0) {
          if (each.currency === "XRP") {
            converted = await SupportedCurrencyService.convertXrpToUsd(
              each.value
            );
          } else {
            converted = await SupportedCurrencyService.convertCurrencyToUSD(
              each.currency,
              parseFloat(each.value)
            );
          }
        }

        totalInUSD += converted;
        return {
          currency: each.currency,
          value: converted,
        };
      })
    );
    allBalances = await Promise.all(
      currencies.map(async (each: any) => {
        const currencyData: any =
          await SupportedCurrencyService.getSingleBySymbol(each.currency);
        const transactions =
          await TransactionService.getAllWalletCurrencyTransaction(
            account._id,
            each.currency
          );
        return {
          image: currencyData?.image ?? null,
          name: currencyData?.name,
          _id: currencyData?._id,
          suppliedTokens: currencyData?.suppliedTokens,
          supply: currencyData?.supply,
          countryCode: currencyData?.code,
          createdAt: currencyData.createdAt,
          updatedAt: currencyData.updatedAt,
          allTransactions: transactions,
          balance: parseFloat(each.value),
          symbol: each.currency,
        };
      })
    );

    const calculatedXRP = await SupportedCurrencyService.convertUSDToXRP(
      totalInUSD
    );

    return {
      allBalances: await allBalances,
      allInUSD,
      totalInUSD: totalInUSD,
      totalInXrp: calculatedXRP,
    };
  }

  public static async create(
    input: any,
    deviceData?: DocumentDefinition<DevicesDocument>
  ) {
    let message = "";
    const existingDevice = await Devices.findOne({
      deviceId: input.deviceId,
    });

    if (existingDevice) {
      message = `device already in use`;
      return { transformedWallet: null, device: null, message, mnemonic: null };
    }

    // const device = await Devices.create(deviceData);
    const wallet = await Wallet.create(input);

    // await WalletDevices.create({ walletId: wallet._id, deviceId: device._id });

    const transformedWallet = wallet.toObject({
      // eslint-disable-next-line no-unused-vars
      transform: (doc, ret, options) => {
        if (ret.password) delete ret.password;
        return ret;
      },
    });

    message = "Wallet Registered Successfully";

    return {
      transformedWallet,
      // device,
      message,
      mnemonic: input.account_recovery_words,
      newWallet: true,
    };
  }

  public static async validateSecretPhrase(
    walletId: string,
    secretPhrase: Array<String>
  ): Promise<Boolean> {
    const account = await Wallet.findById(walletId);

    if (account) {
      return (
        JSON.stringify(account.account_recovery_words) ===
        JSON.stringify(secretPhrase)
      );
    }

    return false;
  }

  public static async import(identifier: string) {
    const recoveryWords = identifier.split(" ");

    const wallet = await Wallet.findOne({
      account_recovery_words: { $all: recoveryWords },
    });
    

    if (!wallet) {
      throw new NotFoundError("Account not found");
    }

    return wallet;
  }

  public static async login(wallet: any, password: string) {
    let message = "";
    const isMatch = await wallet.comparePassword(password);

    if (!isMatch) {
      message = "Invalid Password";
      return { transformedWallet: null, device: null, message };
    }

    // const device = await Devices.findOne({ deviceId });

    let transformedWallet = wallet.toObject({
      // eslint-disable-next-line no-unused-vars
      transform: (doc: any, ret: any, options: any) => {
        if (ret.password) delete ret.password;
        return ret;
      },
    });

    message = "Wallet loggedin successfully";

    return {
      transformedWallet,
      // device,
      message,
      mnemonic: null,
      newWallet: false,
    };
  }

  public static async getSingle(id: any) {
    const wallet = await Wallet.findById(id);
    return wallet;
  }

  public static async getSingleByEmail(email: string) {
    const wallet = await Wallet.findOne({ email });
    return wallet;
  }

  public static async changePassword(id: Types.ObjectId, newPassword: string) {
    // random additional data
    let saltWorkFactor = 10;
    const salt = await bcrypt.genSalt(saltWorkFactor);

    const hash = bcrypt.hashSync(newPassword, salt);
    return await Wallet.findByIdAndUpdate(id, { password: hash });
  }

  public static async updateRole(id: string, role: string) {
    await Wallet.findByIdAndUpdate(id, { role });

    return await this.getSingle(id);
  }
  public static async updateProfile(
    id: Types.ObjectId,
    data: IwalletProfileUpdate,
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
    await Wallet.findByIdAndUpdate(id, url ? { ...data, image: url } : data);

    return await this.getSingle(id);
  }

  public static async deleteWallet(id: Types.ObjectId, res: Response) {
    const wallet = await Wallet.findById(id);

    if (!wallet) {
      throw new NotFoundResponse("wallet not found").send(res);
    }
    const allDevices = await WalletDevices.find({ walletId: id }).sort({
      createdAt: -1,
    });

    const devideIds = allDevices.map((device) => device.deviceId);

    await WalletDevices.deleteMany({ walletId: id });

    await Wallet.findByIdAndDelete(id);

    if (allDevices.length > 0) {
      await Devices.deleteMany({ _id: { $in: devideIds } });
    }
  }

  public static async getTokenRequestsForAddress(xrpAddress: string) {
    return await TokenRequest.find({ receiverAddress: xrpAddress })
      .populate("transactions")
      .sort({ createdAt: -1 });
  }
  public static async sendEmailToCustodialWallet(
    emailRequestOptions: EmailRequestOptions,
    templateId: string,
    subject: string,
    attachmentPath?: string
  ) {
    const { email, data } = emailRequestOptions;

    const options: IEmailOptions = {
      email,
      subject,
      data,
      templateId,
      attachmentPath,
    };
    try {
      await sendEmail(options);
    } catch (err: any) {
      console.log("err", err?.response?.body?.errors);
    }
  }

  public static async getTokenRequestById(id: string) {
    return await TokenRequest.findById(id);
  }

  public static async getAccountByAddress(xrpAddress: string) {
    const account = await Account.findOne({ address: xrpAddress })
      .populate("transactions")
      .populate("walletId");
    const Nfts = this.getWalletNFTs(xrpAddress);

    return { account, Nfts };
  }

  public static async getWalletCards(walletId: string) {
    const cards = await PaymentCard.find({ walletId }).sort({ createdAt: -1 });

    return cards;
  }

  public static async removeWalletCards(card: PaymentCardDocument) {
    await card.deleteOne();
  }

  public static async updateWalletCards(card: PaymentCardDocument, data: any) {
    return await PaymentCard.findByIdAndUpdate(card._id, data);
  }

  public static async verifyPaystackTransaction(reference: string) {
    const trade = await Trade.findOne({
      reference,
    });

    if (!trade)
      throw new BadRequestError(
        `Trade with reference ${reference} does not exist`
      );

    const check = await PaystackService.checkStatus(
      reference,
      trade.currencySymbol as string
    );

    return check;
  }

  public static async addWalletPaystackCard(
    wallet: WalletDocument | undefined,
    currencySymbol: string,
    res: Response,
    paymentAmount: number
  ) {
    const SupportedCurrency = await SupportedCurrencyService.getSingleBySymbol(
      currencySymbol
    );

    let amount = 50;

    if (currencySymbol == "GHS") {
      amount = 1;
    }

    if (!wallet)
      throw new BadRequestResponse("Wallet does not exists").send(res);
    if (!SupportedCurrency) {
      throw new BadRequestResponse("Currency type not supported").send(res);
    }

    // const currentSupply = await operatorBalance(res, currencySymbol);

    // if (SupportedCurrency) {
    //   if (currentSupply <= amount) {
    //     throw new BadRequestResponse(`Maximum supply reached`).send(res);
    //   }
    // }
    const reference = `${wallet._id}-${currencySymbol}-${amount}-${Date.now()}`;
    const callback_url = `${baseUrl}/currencies/buy?currency=${currencySymbol}&step=2&amount=${paymentAmount}`;

    const payment = await PaystackService.charge(
      wallet.accountType == AccountType.CUSTODIAL
        ? wallet.email
        : await this.getRandomEmail(),
      amount,
      reference,
      wallet.name ?? "wallet",
      currencySymbol,
      callback_url,
      true
    );

    if (!payment.response.status) {
      throw new BadRequestResponse(payment?.response?.message ?? "").send(res);
    }

    const trade = await Trade.create({
      walletId: wallet._id,
      amount: amount,
      status: TradeStatus.PENDING,
      paymentGateway: PaymentGatewayType.PAYSTACK,
      tradeType: TradeType.BUY,
      paymentGatewayTransactionId: "",
      currencySymbol,
      reference,
      saveCard: false,
      onboardCard: true,
      reason: "adding paystack authorization instance",
    });

    return {
      url: payment?.link ?? null,
      requestPin: false,
      completed: payment?.link ? false : true,
      trade,
      message: payment.message,
    };
  }

  public static async buytokenWithPaystack(
    level: levelEnum,
    wallet: WalletDocument | undefined,
    amount: number,
    currencySymbol: string,
    payCurrency: string,
    res: Response,
    cardId: string,
    saveCard: boolean,
    referenceReason: string,
    receiverAccountId?: string
  ) {
    const buyXRP = currencySymbol.toUpperCase() === "XRP";
    const SupportedCurrency = await SupportedCurrencyService.getSingleBySymbol(
      currencySymbol
    );

    const payWithCurrency = await SupportedCurrencyService.getSingleBySymbol(
      payCurrency
    );
    if (!payWithCurrency) {
      throw new BadRequestResponse("pay with Currency type not supported").send(
        res
      );
    }
    let token = undefined;
    let cardName = undefined;

    if (level !== levelEnum.ACCOUNT && currencySymbol.toUpperCase() === "XRP") {
      throw new BadRequestResponse(
        `Only XRP can be bought on account level`
      ).send(res);
    }

    if (!wallet)
      throw new BadRequestResponse("Wallet does not exists").send(res);
    if (!SupportedCurrency) {
      throw new BadRequestResponse("Currency type not supported").send(res);
    }

    if (cardId) {
      const cardData = await PaymentCard.findById(cardId);

      if (!cardData) {
        throw new BadRequestResponse(`Card does not exist`).send(res);
      }

      if (cardData.walletId.toString() !== wallet._id.toString()) {
        throw new BadRequestResponse(`Card does not belong to you`).send(res);
      }

      if (!cardData.token) {
        throw new BadRequestResponse(
          `Card does not have a token, kidly add wallet card details`
        ).send(res);
      }
      token = cardData.token;
      cardName = cardData.card_holder;
    }

    const currency = buyXRP ? payWithCurrency : SupportedCurrency;
    let officialAmount = amount;
    let rate = 1;

    if (buyXRP) {
      const usdAmount = await SupportedCurrencyService.convertXrpToUsd(
        officialAmount
      );
      rate = await SupportedCurrencyService.convertRate(
        "USD",
        payWithCurrency.symbol as string
      );
      officialAmount = rate * usdAmount;
    }

    if (currency.symbol === "GHS") {
      if (officialAmount < 1)
        throw new BadRequestResponse(`Amount is too small`).send(res);
    } else {
      if (officialAmount < 50)
        throw new BadRequestResponse(`Amount is too small`).send(res);
    }

    const allowedCurrencies = ["GHS"];

    if (!allowedCurrencies.includes(currency.symbol as string)) {
      throw new BadRequestResponse(
        `Only "GHS" can be payed with paystack`
      ).send(res);
    }

    if (level === levelEnum.ACCOUNT && receiverAccountId !== undefined) {
      const account = await Account.findOne({
        _id: receiverAccountId,
        walletId: wallet._id,
      });

      if (!account) {
        throw new BadRequestResponse(`Account does not exist`).send(res);
      }

      if (account.isBanned === true) {
        throw new BadRequestResponse(
          `Account with id ${receiverAccountId} is banned`
        ).send(res);
      }
    } else {
      if (wallet.isBanned) {
        throw new BadRequestResponse(
          `Account with id ${wallet._id} is banned`
        ).send(res);
      }
    }

    if (currencySymbol.toUpperCase() != "XRP") {
      const currentSupply = await operatorBalance(res, currencySymbol);

      if (currentSupply <= amount) {
        throw new BadRequestResponse(`Maximum supply reached`).send(res);
      }
    } else {
      const currentXRPSupply = await operatorXRPBalance(res);
      if (currentXRPSupply <= amount) {
        throw new BadRequestResponse(
          `not enough XRP balance in Operator account`
        ).send(res);
      }
    }

    const fees = await TransactionService.getFees(
      level,
      officialAmount,
      level == levelEnum.WALLET
        ? TransactionTypeFee.WALLET_BUY
        : buyXRP
        ? TransactionTypeFee.BUY_XRP
        : TransactionTypeFee.ACCOUNT_BUY,
      res
    );

    const email =
      wallet.accountType == AccountType.CUSTODIAL
        ? wallet.email
        : await this.getRandomEmail();

    const reference = `${wallet._id}-${currencySymbol}-${amount}-${Date.now()}`;
    const callback_url = `${baseUrl}/success?currency=${currency.symbol}&amount=${fees.amountToTransact}`;
    const chargeAndFee = Math.ceil(officialAmount + fees.fee);
    const payment = token
      ? await PaystackService.chargeAuthorization(
          email,
          chargeAndFee,
          token,
          reference,
          currency.symbol as string,
          callback_url
        )
      : await PaystackService.charge(
          email,
          chargeAndFee,
          reference,
          cardName ?? wallet.name,
          currency.symbol as string,
          callback_url
        );

    if (!payment.success) {
      throw new BadRequestDataResponse(
        payment?.response?.message ?? "",
        payment?.response?.meta
      ).send(res);
    }
    let trade;
    if (payment.success) {
      await Trade.create({
        walletId: wallet._id,
        amount: fees.amountToTransact,
        status: TradeStatus.PENDING,
        paymentGateway: PaymentGatewayType.PAYSTACK,
        tradeType: TradeType.BUY,
        receiverAccountId: receiverAccountId,
        paymentGatewayTransactionId: "",
        currencySymbol,
        reference,
        saveCard,
        xrpTransaction: buyXRP,
        payCurrency: buyXRP ? payWithCurrency.symbol : currencySymbol,
        payAmount: buyXRP ? amount : 0,
        payRate: fees.feePercentage,
        payFee: fees.fee,
        level,
        reason: referenceReason,
      });
    }

    return {
      url: payment?.link ?? null,
      requestPin: false,
      completed: payment?.link ? false : true,
      trade,
      message: payment.message,
    };
  }

  public static async buytokenWithStripe(
    level: levelEnum,
    wallet: WalletDocument | undefined,
    chargeAmount: number,
    currencySymbol: string,
    payCurrency: string,
    res: Response,
    referenceReason: string,
    receiverAccountId?: string
  ) {
    try {
      const buyXRP = currencySymbol.toUpperCase() === "XRP";

      const SupportedCurrency =
        await SupportedCurrencyService.getSingleBySymbol(currencySymbol);

      const payWithCurrency = await SupportedCurrencyService.getSingleBySymbol(
        payCurrency
      );
      if (!payWithCurrency) {
        throw new BadRequestResponse(
          "pay with Currency type not supported"
        ).send(res);
      }

      if ((payWithCurrency.symbol as string) === "XRP") {
        throw new BadRequestResponse("pay with Currency can not be XRP").send(
          res
        );
      }

      if (!wallet)
        throw new BadRequestResponse("Wallet does not exists").send(res);
      if (!SupportedCurrency) {
        throw new BadRequestResponse("Currency type not supported").send(res);
      }

      const currency = buyXRP ? payWithCurrency : SupportedCurrency;

      let officialAmount = chargeAmount;
      let rate = 1;

      if (buyXRP) {
        const usdAmount = await SupportedCurrencyService.convertXrpToUsd(
          officialAmount
        );
        rate = await SupportedCurrencyService.convertRate(
          "USD",
          payWithCurrency.symbol as string
        );
        officialAmount = rate * usdAmount;
      }
      let amount = officialAmount * 100;

      if (this.ZeroDecimal.includes(currencySymbol)) {
        amount = officialAmount * 1;
      }

      if (currencySymbol != "USD") {
        const amountInUsd = await SupportedCurrencyService.convertCurrencyToUSD(
          currencySymbol,
          officialAmount
        );
        if (!process.env.MINIMUM_AMOUNT_TO_CHARGE)
          throw new BadRequestResponse(
            `MINIMUM_AMOUNT_TO_CHARGE is not set`
          ).send(res);
        if (amountInUsd < parseFloat(process.env.MINIMUM_AMOUNT_TO_CHARGE))
          throw new BadRequestResponse(`Amount is too small`).send(res);
      } else {
        if (!process.env.MINIMUM_AMOUNT_TO_CHARGE)
          throw new BadRequestResponse(
            `MINIMUM_AMOUNT_TO_CHARGE is not set`
          ).send(res);
        if (chargeAmount < parseFloat(process.env.MINIMUM_AMOUNT_TO_CHARGE))
          throw new BadRequestResponse(`Amount is too small`).send(res);
      }

      if (level === levelEnum.ACCOUNT && receiverAccountId !== undefined) {
        const account = await Account.findOne({
          _id: receiverAccountId,
          walletId: wallet._id,
        });

        if (!account) {
          throw new BadRequestResponse(`Account does not exist`).send(res);
        }

        if (account.isBanned === true) {
          throw new BadRequestResponse(
            `Account with id ${receiverAccountId} is banned`
          ).send(res);
        }
      } else {
        if (wallet.isBanned) {
          throw new BadRequestResponse(
            `Account with id ${wallet._id} is banned`
          ).send(res);
        }
      }

      if (currencySymbol.toUpperCase() != "XRP") {
        const currentSupply = await operatorBalance(res, currencySymbol);

        if (currentSupply <= amount) {
          throw new BadRequestResponse(`Maximum supply reached`).send(res);
        }
      } else {
        const currentXRPSupply = await operatorXRPBalance(res);

        if (currentXRPSupply <= chargeAmount) {
          throw new BadRequestResponse(
            `not enough XRP balance in Operator account`
          ).send(res);
        }
      }

      const fees = await TransactionService.getFees(
        level,
        officialAmount,
        level == levelEnum.WALLET
          ? TransactionTypeFee.WALLET_BUY
          : buyXRP
          ? TransactionTypeFee.BUY_XRP
          : TransactionTypeFee.ACCOUNT_BUY,
        res
      );

      // get stripe customer id for the login wallet if it exist
      let isStripeCustomerValid = true;
      if (!wallet?.stripe_customer_id || wallet?.stripe_customer_id === "") {
        isStripeCustomerValid = false;
      } else {
        try {
          const customer = await stripe.customers.retrieve(
            wallet.stripe_customer_id
          );
          if (!customer?.id) isStripeCustomerValid = false;
        } catch (e) {
          isStripeCustomerValid = false;
        }
      }

      const session = await stripe.checkout.sessions.create(
        {
          billing_address_collection: "auto",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: currency.symbol as string,
                product_data: {
                  name: "Subscription",
                },
                unit_amount: Math.ceil(amount),
              },
              quantity: 1,
            },
          ],
          payment_intent_data: {
            setup_future_usage: "on_session",
          },
          allow_promotion_codes: true,
          mode: "payment",
          success_url: `${baseUrl}/success?currency=${currency.symbol}&amount=${fees.amountToTransact}`,

          cancel_url: `${baseUrl}/failed`,
        },
        {
          stripe_account: process.env.STRIPE_ACCOUNT as string,
        }
      );

      const tradeObject: any = {
        walletId: wallet._id,
        amount: fees.amountToTransact,
        status: TradeStatus.PENDING,
        paymentGateway: PaymentGatewayType.STRIPE,
        tradeType: TradeType.BUY,
        paymentGatewayTransactionId: session.payment_intent as string,
        currencySymbol: currencySymbol,
        level,
        xrpTransaction: buyXRP,
        payCurrency: buyXRP ? payWithCurrency.symbol : currencySymbol,
        payAmount: buyXRP ? chargeAmount : 0,
        reason: referenceReason,
      };

      if (level === levelEnum.ACCOUNT && receiverAccountId !== undefined) {
        tradeObject.receiverAccountId = receiverAccountId;
      }

      const trade = await Trade.create(tradeObject);

      return { url: session.url, trade };
    } catch (e: any) {
      console.log(e);
      if (e.raw.message) {
        throw new BadRequestResponse(e.raw.message).send(res);
      }
    }
  }

  private static async webhookSuccessDisbursement(trade: any, res: Response) {
    let tradeStatus = await Trade.findByIdAndUpdate(trade?._id, {
      status: TradeStatus.SUCCESS,
      webhook_status: TradeStatus.SUCCESS,
    });
    console.log("Step 1: completed - Trade was successful");
    console.log(trade);

    if (trade.tradeType === TradeType.BUY && trade.currencySymbol) {
      console.log("start disbursement");
      const operatorAccountId = process.env.OPERATOR_WALLET_ID as string;
      const senderAccount = await Account.findById(
        process.env.OPERATOR_WALLET_ID
      ).select("+secret");

      if (!senderAccount) {
        throw new BadRequestResponse(
          `can not find account with id ${operatorAccountId}`
        ).send(res);
      }
      console.log(
        `Step 2: Sender account id fetched successfully = ${senderAccount}`
      );

      let receiver;

      if (
        trade.level === levelEnum.ACCOUNT &&
        trade.receiverAccountId !== undefined
      ) {
        const receiverAccount = await Account.findById(
          trade.receiverAccountId
        ).select("+secret");

        if (!receiverAccount) {
          throw new BadRequestResponse(
            `can not find account with id ${trade.receiverAccountId}`
          ).send(res);
        }

        if (receiverAccount.isBanned === true) {
          throw new BadRequestResponse(
            `Account with id ${trade.receiverAccountId} is banned`
          ).send(res);
        }

        if (receiverAccount._id.toString() === operatorAccountId) {
          throw new BadRequestResponse(`can not send funds to operator`).send(
            res
          );
        }

        console.log(
          `Step 3: Reciever account id fetched successfully = ${receiverAccount}`
        );

        receiver = receiverAccount;
      }

      if (trade.receiverAccountId === operatorAccountId) {
        throw new BadRequestResponse(
          `can not distribute to your own account`
        ).send(res);
      }

      console.log("Step 4: Reciever and Sender account id are not thesame");
      const SupportedCurrency =
        await SupportedCurrencyService.getSingleBySymbol(trade.currencySymbol);

      if (!SupportedCurrency) {
        throw new BadRequestResponse("currency is not supported").send(res);
      }
      console.log("Step 5: Currency is suported");

      if (!trade.xrpTransaction) {
        const currentSupply = await operatorBalance(res, trade.currencySymbol);

        if (currentSupply <= trade.amount) {
          throw new BadRequestResponse(`Maximum supply reached`).send(res);
        }
      } else {
        const currentXRPSupply = await operatorXRPBalance(res);
        if (currentXRPSupply <= trade.payAmount) {
          throw new BadRequestResponse(
            `not enough XRP balance in Operator account`
          ).send(res);
        }
      }
      console.log("Step 6: Maximum supply not reached");

      console.log("Step 7: Begin Distribute currency");

      const transaction: any =
        await SupportedCurrencyService.distributeCurrency(
          trade.walletId.toString(),
          senderAccount,
          trade.xrpTransaction ? Math.floor(trade.payAmount) : trade.amount,
          SupportedCurrency as SupportedCurrenciesDocument,
          res,
          trade.level,
          trade.reason,
          trade.xrpTransaction,
          trade.payFee,
          trade.payAmount,
          trade.payRate,
          receiver
        );
      if (!transaction)
        throw new BadRequestResponse("Transaction failed").send(res);

      tradeStatus = await Trade.findByIdAndUpdate(trade?._id, {
        transactionId: transaction._id,
      });

      await NotificationService.addNotification(
        trade.walletId,
        `Purchase Complete`,
        `You have successfully purchased ${trade.amount} ${SupportedCurrency.symbol}`
      );
      console.log("Step 8: End Distribute currency");
      return { transaction, tradeStatus };
    }
  }

  public static async stripeWebhookForBuytoken(body: any, res: Response) {
    let event = body;
    console.log(`Webhook Initiated ${event.type}`);

    console.log("Step 1: Fetching trade");
    const paymentIntent = (event as Stripe.Event).data.object;
    const trade: any = await Trade.findOne({
      paymentGatewayTransactionId: (paymentIntent as any).id,
    });

    if (!trade)
      throw new BadRequestError(
        `Trade with id ${(paymentIntent as any).id} does not exist`
      );
    if (event.type != "payment_intent.succeeded") {
      await Trade.findByIdAndUpdate(trade?._id, {
        status: TradeStatus.FAILED,
      });
      throw new BadRequestResponse(
        `Payment is not successful ${event.type}`
      ).send(res);
    }

    console.log("start disbursement");
    return await this.webhookSuccessDisbursement(trade, res);
  }

  public static async savePaystackPaymentCard(payload: any, walletId: string) {
    const findCardByToken = await PaymentCard.findOne({
      token: payload?.data?.authorization?.authorization_code,
    });

    const {
      card_type,
      authorization_code,
      last4,
      exp_month,
      exp_year,
      bin,
      channel,
      signature,
      country_code,
      account_name,
    } = payload?.data?.authorization;

    if (!findCardByToken) {
      await PaymentCard.create({
        walletId,
        bin,
        last_4digits: last4,
        type: card_type,
        country: country_code,
        token: authorization_code,
        expireMonth: exp_month,
        expireYear: exp_year,
        signature,
        card_holder: account_name ?? "",
        channel: channel,
        for: CARD_TYPE.PAYSTACK,
      });
      console.log("card added");
    }
  }

  public static async paystackWebhookForBuytoken(payload: any, res: Response) {
    if (payload.event != "charge.success") {
      throw new BadRequestResponse(
        `payment with reference ${payload.data.reference} failed`
      ).send(res);
    }
    const trade = await Trade.findOne({
      reference: payload.data.reference,
    });

    if (!trade) {
      throw new BadRequestError(
        `Trade with reference ${payload.data.reference} does not exist`
      );
    }

    const txStatus = payload.data.status == "success" ? "successful" : "failed";

    if (trade.webhook_status === txStatus) {
      throw new BadRequestError(`Duplicate event ${payload}`);
    }

    const status = await PaystackService.checkStatus(
      payload.data.reference,
      trade.xrpTransaction
        ? (trade.payCurrency as string)
        : (trade.currencySymbol as string)
    );

    if (!status.success) {
      await Trade.findByIdAndUpdate(trade?._id, {
        status: TradeStatus.FAILED,
        webhook_status: payload.status,
      });
      throw new BadRequestDataError(
        `Trade with reference ${payload.data.reference} failed`,
        status
      );
    }

    if (payload?.data?.authorization?.reusable && trade.saveCard) {
      await this.savePaystackPaymentCard(
        payload,
        trade.walletId as unknown as string
      );
    }

    if (trade.onboardCard && payload?.data?.authorization?.reusable) {
      const refund = await PaystackService.transactionRefund(
        status.status?.data?.id
      );

      if (refund.success) {
        await this.savePaystackPaymentCard(
          payload,
          trade.walletId as unknown as string
        );
      }
    }

    console.log("trade Status is Success");

    if (trade.onboardCard) {
      return;
    }

    return await this.webhookSuccessDisbursement(trade, res);
  }

  public static async createSellerAccountOnStripe(
    wallet: WalletDocument | undefined,
    country: string,
    alias: string,
    res: Response
  ) {
    try {
      if (!wallet) throw new BadRequestResponse("Invalid wallet").send(res);
      const existingMethods = await WithdrawMethod.find({
        wallet: wallet._id,
        gateway: WithdrawGateway.STRIPE,
      }).sort({ createdAt: -1 });
      if (existingMethods.length != 0) {
        throw new BadRequestResponse(
          "wallet is already oboarded as a seller"
        ).send(res);
      }

      // Create a Stripe Connect account for the seller
      const account = await stripe.accounts.create({
        type: "custom",
        country: country,
        capabilities: {
          card_payments: {
            requested: true,
          },
          transfers: {
            requested: true,
          },
        },
      });

      // Generate an account link for the seller to complete their onboarding process
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: "${baseUrl}/onboard-success",
        return_url: "${baseUrl}/onboard-failed",
        type: "account_onboarding",
      });

      await WithdrawMethod.create({
        gateway: WithdrawGateway.STRIPE,
        wallet: wallet._id,
        stripe_account_id: account.id,
        alias,
      });

      return { account, accountLink };
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }

  public static async isAfricanPhoneNumber(phoneNumber: string) {
    const regex =
      /^(\+|00)?(212|213|216|218|220|221|222|223|224|225|226|227|228|229|230|231|232|233|234|235|236|237|238|239|240|241|242|243|244|245|246|247|248|249|250|251|252|253|254|255|256|257|258|260|261|262|263|264|265|266|267|268|269|27|290|291|297|298|299)\d{7,}$/;
    return regex.test(phoneNumber);
  }

  public static async airtimeTopUp(
    wallet: WalletDocument | undefined,
    level: levelEnum,
    amount: number,
    currency: string,
    phoneNumber: string,
    res: Response,
    reason: string,
    accountId?: string
  ) {
    let transaction: any;
    if (!wallet) throw new BadRequestResponse("Invalid wallet").send(res);
    const SupportedCurrency = await SupportedCurrencyService.getSingleBySymbol(
      currency
    );

    if (!SupportedCurrency) {
      throw new BadRequestResponse("currency is not supported").send(res);
    }
    try {
      const isAfrican = this.isAfricanPhoneNumber(phoneNumber);

      if (!isAfrican) {
        throw new BadRequestResponse(
          "Phone number should be a valid phone number"
        ).send(res);
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

      if (level === levelEnum.WALLET) {
        const walletVault = await Vault.findOne({
          Wallet: wallet._id,
        });

        if (!walletVault) {
          return new BadRequestResponse(`wallet does not have a vault`).send(
            res
          );
        }

        const transactionInstance = await Transaction.create({
          senderId: wallet._id,
          senderMoxId: walletVault.tag,
          amount: amount,
          senderAddress: walletVault.address,
          status: TransactionStatus.PENDING,
          type: TransactionType.AIRTIME_TOPUP,
          currency: currency,
          reason,
        });
        transaction = await this.burnAndTransferTokenToIssuer(
          walletVault,
          amount,
          currency,
          res,
          SupportedCurrency,
          transactionInstance
        );
      }

      if (level === levelEnum.ACCOUNT) {
        if (!accountId) {
          throw new BadRequestResponse(
            "AccountId is a required field for Accounts"
          ).send(res);
        }

        const account = await Account.findOne({
          _id: accountId,
          walletId: wallet?._id,
        })
          .select("+secret")
          .fill("balance")
          .fill("assets");

        if (!account) {
          throw new BadRequestResponse(
            `can not find account with id ${accountId}`
          ).send(res);
        }

        if (account.isBanned === true) {
          throw new BadRequestResponse(
            `Account with id ${accountId} is banned`
          ).send(res);
        }

        const transactionInstance = await Transaction.create({
          senderId: wallet._id,
          amount: amount,
          senderAddress: account.address,
          status: TransactionStatus.PENDING,
          type: TransactionType.AIRTIME_TOPUP,
          currency: currency,
          reason,
        });

        transaction = await this.transferTokensToIssuer(
          account,
          amount,
          currency,
          res,
          SupportedCurrency,
          transactionInstance
        );
      }

      if (true) {
        if (transaction.status === TransactionStatus.FAILED) {
          if (level === levelEnum.WALLET && wallet.email) {
            await WalletService.sendEmailToCustodialWallet(
              {
                email: wallet.email as string,
                data: {
                  amount: `${currency} ${amount}`,
                  sender: "N/A",
                  reference: transaction._id,
                },
              },
              process.env.FAILED_TRANSACTION as string,
              "Mox Transaction Failed"
            );
          }
          throw new BadRequestResponse(`Transaction failed`).send(res);
        }
        const request = await AfricasTalkingService.sendAirtime(
          currency,
          phoneNumber,
          amount
        );

        if (!request.success) {
          await transaction?.updateOne({
            status: TransactionStatus.FAILED,
            errorMessage: `Fund transfer is not successful ${request.message}, Refund in process`,
          });
          await this.sellingRefund(
            wallet,
            level,
            amount,
            SupportedCurrency,
            res,
            accountId
          );
          throw new BadRequestResponse(request.message).send(res);
        }

        return {
          request,
          transaction,
        };
      }
    } catch (error: any) {
      await transaction?.updateOne({
        status: TransactionStatus.FAILED,
        errorMessage: `Fund transfer is not successful ${error.message}`,
      });
      throw new BadRequestResponse(
        `Fund transfer is not successful ${error.message}`
      ).send(res);
      throw new BadRequestError(error);
    }
  }

  public static async transferTokensToIssuer(
    account: any,
    amount: number,
    currency: string,
    res: Response,
    SupportedCurrency: any,
    transaction: any
  ) {
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

    const balance = account?.assets;

    if (!balance?.assets) {
      throw new BadRequestResponse(`Sender has no trustline currency`).send(
        res
      );
    }

    const senderCurrencyBalance = balance?.assets[
      process.env.ISSUER_ADDRESS
    ].filter((each: any) => each.currency === currency);

    if (!senderCurrencyBalance[0]?.value) {
      await transaction?.updateOne({
        status: TransactionStatus.FAILED,
        errorMessage: `Sender has 0 ${currency}`,
      });
      throw new BadRequestResponse(`Sender has 0 ${currency}`).send(res);
    }

    if (parseFloat(senderCurrencyBalance[0]?.value) < amount) {
      await transaction?.updateOne({
        status: TransactionStatus.FAILED,
        errorMessage: "Insufficient funds to withdraw",
      });
      throw new BadRequestResponse(`Insufficient funds to withdraw`).send(res);
    }

    const tx: any = await RippleService.sellCurrecy(
      res,
      account.secret,
      currency,
      amount,
      transaction
    );

    console.log(tx, transaction);

    if (tx) {
      await transaction?.updateOne({
        hashLink: TransactionService.formatHashLink(tx?.result?.hash) ?? "",
        status:
          tx?.result?.meta?.TransactionResult !== "tesSUCCESS" ||
          !tx?.result?.hash
            ? TransactionStatus.FAILED
            : TransactionStatus.SUCCESS,
      });
    }
    const transactions = account.transactions;
    const adminsTransactions = operatorAccount.transactions;

    await account.updateOne({
      transactions: [...transactions, transaction._id],
    });

    await operatorAccount.updateOne({
      transactions: [...adminsTransactions, transaction._id],
    });

    await SupportedCurrency?.updateOne({
      suppliedTokens: SupportedCurrency.suppliedTokens - amount,
    });

    const newTransaction = await Transaction.findById(transaction._id);

    PusherService.triggerPusherEvent(
      account.walletId.toString(),
      PusherEvent.TRANSACTIONS_UPDATED,
      newTransaction
    );
    return newTransaction;
  }

  public static async burnAndTransferTokenToIssuer(
    senderVault: any,
    amount: number,
    currency: string,
    res: Response,
    SupportedCurrency: any,
    transaction: any
  ) {
    const sender = await WalletService.getSingle(senderVault.Wallet);

    if (!sender) {
      return new NotFoundResponse(`could not find this wallet`).send(res);
    }

    if (sender.isBanned === true) {
      throw new BadRequestResponse(
        `Account with id ${senderVault.Wallet} is banned`
      ).send(res);
    }

    const walletAsset = await VaultAsset.findOne({
      vault: senderVault._id,
      SupportedCurrency: SupportedCurrency._id,
    });

    if (!walletAsset) {
      return new BadRequestResponse(`wallet does not hold such currency`).send(
        res
      );
    }

    const grandVault: any = await Vault.findOne({
      isGrandVault: true,
    }).populate("account");

    if (!grandVault) {
      return new BadRequestResponse(`could not find a grandVault`).send(res);
    }

    const grandVaultSecret = await Account.findById(
      grandVault.account._id
    ).select("+secret");

    if (walletAsset.balance < amount) {
      await transaction?.updateOne({
        status: TransactionStatus.FAILED,
        errorMessage: "Insufficient funds to withdraw",
      });
      throw new BadRequestResponse(`Insufficient funds to withdraw`).send(res);
    }

    const tx: any = await RippleService.sellCurrecy(
      res,
      grandVaultSecret.secret,
      currency,
      amount,
      transaction
    );

    console.log(tx);
    if (tx) {
      await transaction?.updateOne({
        hashLink: TransactionService.formatHashLink(tx?.result?.hash) ?? "",
        status:
          tx?.result?.meta?.TransactionResult !== "tesSUCCESS" ||
          !tx?.result?.hash
            ? TransactionStatus.FAILED
            : TransactionStatus.SUCCESS,
      });
      await walletAsset.updateOne({
        balance: walletAsset.balance - amount,
      });
    }

    await senderVault.updateOne({
      transactions: [...senderVault.transactions, transaction._id],
    });

    await grandVault.updateOne({
      transactions: [...grandVault.transactions, transaction._id],
    });

    const newTransaction = await Transaction.findById(transaction._id);

    PusherService.triggerPusherEvent(
      senderVault.Wallet.toString(),
      PusherEvent.TRANSACTIONS_UPDATED,
      newTransaction
    );

    return newTransaction;
  }

  public static async trasferFundWithPaystack(
    level: levelEnum,
    wallet: WalletDocument | undefined,
    amount: number,
    res: Response,
    withdrawMethod: string,
    reason: string,
    accountId?: string,
    currency?: string
  ) {
    if (!wallet) throw new BadRequestResponse("Invalid wallet").send(res);
    const method: any = await PayoutService.getSingleWithDrawMethod(
      wallet._id,
      withdrawMethod
    );

    if (!method)
      throw new BadRequestResponse(
        "Invalid method. Wallet is not a seller"
      ).send(res);

    if (method.gateway !== WithdrawGateway.PAYSTACK)
      throw new BadRequestResponse(
        "Withdraw method should be for paystack"
      ).send(res);

    const SupportedCurrency = await SupportedCurrencyService.getSingleBySymbol(
      currency ? currency : currency ? currency : method.currency.symbol
    );

    if (!SupportedCurrency) {
      throw new BadRequestResponse("currency is not supported").send(res);
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

    let transaction: any;

    try {
      if (currency ? currency : method.currency.symbol == "GHS") {
        if (amount < 1)
          throw new BadRequestResponse(`Amount is too small`).send(res);
      } else {
        if (amount < 50) {
          throw new BadRequestResponse(`Amount is too small`).send(res);
        }
      }

      const currentSupply = await grandVaultBalance(
        res,
        currency ? currency : method.currency.symbol
      );

      if (currentSupply < amount) {
        throw new BadRequestResponse(`grandvault has insufficient funds`).send(
          res
        );
      }
      const fees = await TransactionService.getFees(
        levelEnum.ACCOUNT,
        amount,
        level === levelEnum.ACCOUNT && accountId !== undefined
          ? TransactionTypeFee.ACCOUNT_SELL
          : TransactionTypeFee.WALLET_SELL,
        res
      );

      if (level === levelEnum.ACCOUNT && accountId) {
        const account = await Account.findOne({
          _id: accountId,
          walletId: wallet?._id,
        })
          .select("+secret")
          .fill("balance")
          .fill("assets");

        if (!account) {
          throw new BadRequestResponse(
            `can not find account with id ${accountId}`
          ).send(res);
        }

        if (account.isBanned === true) {
          throw new BadRequestResponse(
            `Account with id ${accountId} is banned`
          ).send(res);
        }
        const transactionInstance = await Transaction.create({
          senderId: wallet?._id,
          senderAccount: accountId,
          amount,
          receiverId: operatorAccount.walletId,
          receiverAccount: operatorAccount._id,
          receiverAddress: operatorAccount.address,
          senderAddress: account.address,
          status: TransactionStatus.PENDING,
          type: TransactionType.SELL,
          currency: SupportedCurrency.symbol ?? "XRP",
          reason,
        });
        console.log("transactionInstance", transactionInstance);
        transaction = await this.transferTokensToIssuer(
          account,
          amount,
          currency ? currency : method.currency.symbol,
          res,
          SupportedCurrency,
          transactionInstance
        );
      }

      if (level === levelEnum.WALLET) {
        const walletVault = await Vault.findOne({
          Wallet: wallet._id,
        });

        if (!walletVault) {
          return new BadRequestResponse(`wallet does not have a vault`).send(
            res
          );
        }
        const transactionInstance = await Transaction.create({
          senderId: wallet._id,
          amount: amount,
          senderAddress: walletVault.address,
          status: TransactionStatus.PENDING,
          type: TransactionType.SELL,
          currency: currency ? currency : method.currency.symbol ?? "XRP",
          reason,
        });
        transaction = await this.burnAndTransferTokenToIssuer(
          walletVault,
          amount,
          currency ? currency : method.currency.symbol,
          res,
          SupportedCurrency,
          transactionInstance
        );
      }

      console.log("transaction", transaction);

      if (transaction) {
        if (transaction.status === TransactionStatus.FAILED) {
          await this.sellingRefund(
            wallet,
            level,
            amount,
            SupportedCurrency,
            res,
            accountId
          );
          throw new BadRequestResponse(`Transaction failed`).send(res);
        }

        const reference = `${wallet._id}-${
          currency ? currency : method.currency.symbol
        }-${Date.now()}`;

        const transfer = await PaystackService.transferToWallet(
          `Selling ${currency ? currency : method.currency.symbol}`,
          Math.floor(fees.amountToTransact).toString(),
          method?.recipient_code as string,
          reference.toLowerCase(),
          currency ? currency : method.currency.symbol
        );

        if (!transfer.success) {
          await this.sellingRefund(
            wallet,
            level,
            amount,
            SupportedCurrency,
            res,
            accountId
          );
          throw new BadRequestResponse(transfer.message).send(res);
        }

        await Trade.create({
          walletId: wallet._id,
          amount,
          status: TradeStatus.SUCCESS,
          paymentGateway: PaymentGatewayType.PAYSTACK,
          tradeType: TradeType.SELL,
          transactionId: transaction._id,
          currencySymbol: currency ? currency : method.currency.symbol,
        });

        await NotificationService.addNotification(
          wallet?._id,
          `You have sold ${amount} ${
            currency ? currency : method.currency.symbol
          }`,
          `${amount} ${
            currency ? currency : method.currency.symbol
          } was sold from your account using paystack, you should receive ${
            fees.amountToTransact
          }`
        );
      }
    } catch (err: any) {
      await transaction?.updateOne({
        status: TransactionStatus.FAILED,
        errorMessage: `Fund transfer is not successful`,
      });
      throw new BadRequestResponse(`Fund transfer is not successful`).send(res);
    }
  }

  public static async sellingRefund(
    wallet: any,
    level: levelEnum,
    amount: number,
    SupportedCurrency: any,
    res: Response,
    accountId?: string
  ) {
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
    if (level === levelEnum.ACCOUNT && accountId !== undefined) {
      const receiverAccount = await Account.findById(accountId)
        .select("+secret")
        .fill("balance")
        .fill("assets");

      if (!receiverAccount) {
        throw new BadRequestResponse(
          `can not find account with id ${accountId}`
        ).send(res);
      }
      const transactionRefund = await Transaction.create({
        senderId: wallet._id,
        amount: amount,
        senderAddress: operatorAccount.address,
        receiverAddress: receiverAccount.address,
        status: TransactionStatus.PENDING,
        type: TransactionType.REFUND,
        currency: SupportedCurrency.symbol,
        reason: `Refund of ${amount} ${SupportedCurrency.symbol}`,
      });
      const refundtx: any = await RippleService.sendCurrecy(
        res,
        receiverAccount.secret,
        operatorAccount.secret,
        receiverAccount?.address,
        SupportedCurrency.symbol,
        amount,
        transactionRefund
      );
      if (refundtx) {
        await transactionRefund?.updateOne({
          hashLink:
            TransactionService.formatHashLink(refundtx?.result?.hash) ?? "",
          status:
            refundtx?.result?.meta?.TransactionResult !== "tesSUCCESS" ||
            !refundtx?.result?.hash
              ? TransactionStatus.FAILED
              : TransactionStatus.SUCCESS,
        });
      }
      console.log("refund triggered");
      const transactions = receiverAccount.transactions;
      const adminsTransactions = operatorAccount.transactions;

      await receiverAccount.updateOne({
        transactions: [...transactions, transactionRefund._id],
      });

      await operatorAccount.updateOne({
        transactions: [...adminsTransactions, transactionRefund._id],
      });

      PusherService.triggerPusherEvent(
        wallet._id.toString(),
        PusherEvent.TRANSACTIONS_UPDATED,
        transactionRefund
      );
    }

    if (level === levelEnum.WALLET) {
      const walletVault = await Vault.findOne({
        Wallet: wallet._id,
      });

      if (!walletVault) {
        return new BadRequestResponse(`wallet does not have a vault`).send(res);
      }

      const walletAsset = await VaultAsset.findOne({
        vault: walletVault._id,
        SupportedCurrency: SupportedCurrency._id,
      });

      if (!walletAsset) {
        return new BadRequestResponse(
          `wallet does not hold such currency`
        ).send(res);
      }

      await walletAsset.updateOne({
        balance: walletAsset.balance + amount,
      });

      const transactionRefund = await Transaction.create({
        senderId: wallet._id,
        amount: amount,
        senderAddress: operatorAccount.address,
        recepientMoxId: walletVault.tag,
        receiverAddress: walletVault.address,
        status: TransactionStatus.SUCCESS,
        type: TransactionType.REFUND,
        currency: SupportedCurrency.symbol,
        reason: `Refund of ${amount} ${SupportedCurrency.symbol}`,
      });

      await WalletService.sendEmailToCustodialWallet(
        {
          email: wallet.email as string,
          data: {
            amount: `${SupportedCurrency.symbol} ${amount}`,
            sender: wallet.name ?? walletVault?.address,
            reference: "",
          },
        },
        process.env.FAILED_TRANSACTION as string,
        "Mox Transaction Failed"
      );

      await walletVault.updateOne({
        transactions: [...walletVault.transactions, transactionRefund._id],
      });
      PusherService.triggerPusherEvent(
        wallet._id.toString(),
        PusherEvent.TRANSACTIONS_UPDATED,
        transactionRefund
      );
    }
  }

  public static async trasferFundWithStripe(
    level: levelEnum,
    wallet: WalletDocument | undefined,
    chargeAmount: number,
    res: Response,
    withdrawMethod: string,
    reason: string,
    accountId?: string,
    currency?: string
  ) {
    let amount = chargeAmount * 100;
    if (!wallet) throw new BadRequestResponse("Invalid wallet").send(res);
    const method: any = await PayoutService.getSingleWithDrawMethod(
      wallet._id,
      withdrawMethod
    );

    if (!method)
      throw new BadRequestResponse(
        "Invalid method. Wallet is not a seller"
      ).send(res);
    if (!method.stripe_account_id)
      throw new BadRequestResponse(
        "Invalid destination. Wallet is not a seller"
      ).send(res);

    if (method.gateway !== WithdrawGateway.STRIPE)
      throw new BadRequestResponse("Withdraw method should be for stripe").send(
        res
      );
    let paymentIntent;
    let transaction: any;

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

    const SupportedCurrency = await SupportedCurrencyService.getSingleBySymbol(
      currency ? currency : method.currency.symbol
    );

    if (!SupportedCurrency) {
      throw new BadRequestResponse("currency is not supported").send(res);
    }

    try {
      let amountInUsd;

      if (!process.env.MINIMUM_AMOUNT_TO_CHARGE)
        throw new BadRequestResponse(
          `MINIMUM_AMOUNT_TO_CHARGE is not set`
        ).send(res);
      if (currency ? currency : method.currency.symbol != "USD") {
        if (
          this.ZeroDecimal.includes(
            currency ? currency : method.currency.symbol
          )
        ) {
          amount = chargeAmount * 1;
        }

        amountInUsd = await SupportedCurrencyService.convertCurrencyToUSD(
          currency ? currency : method.currency.symbol,
          chargeAmount
        );

        if (amountInUsd < parseFloat(process.env.MINIMUM_AMOUNT_TO_CHARGE))
          throw new BadRequestResponse(`Amount is too small`).send(res);
      } else {
        if (chargeAmount < parseFloat(process.env.MINIMUM_AMOUNT_TO_CHARGE)) {
          throw new BadRequestResponse(`Amount is too small`).send(res);
        }
      }

      const fees = await TransactionService.getFees(
        levelEnum.ACCOUNT,
        chargeAmount,
        level === levelEnum.ACCOUNT && accountId !== undefined
          ? TransactionTypeFee.ACCOUNT_SELL
          : TransactionTypeFee.WALLET_SELL,
        res
      );

      const currentSupply = await grandVaultBalance(
        res,
        currency ? currency : method.currency.symbol
      );

      if (currentSupply < amount) {
        throw new BadRequestResponse(`grandvault has insufficient funds`).send(
          res
        );
      }

      if (level === levelEnum.ACCOUNT && accountId !== undefined) {
        const account = await Account.findOne({
          _id: accountId,
          walletId: wallet?._id,
        })
          .select("+secret")
          .fill("balance")
          .fill("assets");

        if (!account) {
          throw new BadRequestResponse(
            `can not find account with id ${accountId}`
          ).send(res);
        }

        if (account.isBanned === true) {
          throw new BadRequestResponse(
            `Account with id ${accountId} is banned`
          ).send(res);
        }
        const transactionInstance = await Transaction.create({
          senderId: wallet?._id,
          senderAccount: accountId,
          amount,
          receiverId: operatorAccount.walletId,
          receiverAccount: operatorAccount._id,
          receiverAddress: operatorAccount.address,
          senderAddress: account.address,
          status: TransactionStatus.PENDING,
          type: TransactionType.SELL,
          currency: SupportedCurrency.symbol ?? "XRP",
          reason,
        });
        transaction = await this.transferTokensToIssuer(
          account,
          chargeAmount,
          currency ? currency : method.currency.symbol,
          res,
          SupportedCurrency,
          transactionInstance
        );
      }

      if (level === levelEnum.WALLET) {
        const walletVault = await Vault.findOne({
          Wallet: wallet._id,
        });

        if (!walletVault) {
          return new BadRequestResponse(`wallet does not have a vault`).send(
            res
          );
        }
        const transactionInstance = await Transaction.create({
          senderId: wallet._id,
          amount: amount,
          senderAddress: walletVault.address,
          status: TransactionStatus.PENDING,
          type: TransactionType.SELL,
          currency: currency ? currency : method.currency.symbol ?? "XRP",
          reason,
        });
        transaction = await this.burnAndTransferTokenToIssuer(
          walletVault,
          chargeAmount,
          currency ? currency : method.currency.symbol,
          res,
          SupportedCurrency,
          transactionInstance
        );
      }

      if (transaction) {
        if (transaction.status === TransactionStatus.FAILED) {
          await this.sellingRefund(
            wallet,
            level,
            chargeAmount,
            SupportedCurrency,
            res,
            accountId
          );
          throw new BadRequestResponse(`Transaction failed`).send(res);
        }
        const adminPaymentMethodId = await PaymentCard.findOne({
          walletId: process.env.ADMIN_ID as string,
          for: CARD_TYPE.STRIPE,
        });

        if (!adminPaymentMethodId?.payment_card_id)
          throw new BadRequestResponse(`Invalid payment method`).send(res);
        if (
          !adminPaymentMethodId.payment_card_id ||
          !adminPaymentMethodId.card_number ||
          !adminPaymentMethodId.cvc
        )
          throw new BadRequestResponse(`Invalid card`).send(res);

        const requestOption: any = {
          type: "card",
          card: {
            number: adminPaymentMethodId.card_number,
            exp_month: 8,
            exp_year: 2023,
            cvc: adminPaymentMethodId.cvc,
          },
        };

        const paymentMethod = await stripe.paymentMethods.create(requestOption);

        paymentIntent = await stripe.paymentIntents.create({
          amount: fees.amountToTransact,
          currency: currency ? currency : method.currency.symbol,
          payment_method_types: ["card"],
          payment_method: paymentMethod.id,
          confirm: true,
          return_url: "${baseUrl}/success",
          transfer_data: {
            // amount: 1000, //if admin needs to charge
            destination: method.stripe_account_id,
          },
        });
        if (paymentIntent) {
          await Trade.create({
            walletId: wallet._id,
            amount: amount,
            status: TradeStatus.PENDING,
            paymentGateway: PaymentGatewayType.STRIPE,
            tradeType: TradeType.SELL,
            receiverAccountId: method.stripe_account_id,
            paymentGatewayTransactionId: (paymentIntent as any).id as string,
            transactionId: transaction._id,
            currencySymbol: currency ? currency : method.currency.symbol,
          });
          await NotificationService.addNotification(
            wallet?._id,
            `You have sold ${amount} ${
              currency ? currency : method.currency.symbol
            }`,
            `${amount} ${
              currency ? currency : method.currency.symbol
            } was sold from your account using stripe, you should receive ${
              fees.amountToTransact
            }`
          );
        }
      }
    } catch (err: any) {
      await transaction?.updateOne({
        status: TransactionStatus.FAILED,
        errorMessage: `Fund transfer is not successful ${err.message}`,
      });
      throw new BadRequestResponse(
        `Fund transfer is not successful ${err.message}`
      ).send(res);
    }
    return paymentIntent;
  }

  public static async resolveRecipient(
    type: TransferRecipientType,
    name: string,
    bank_code: string,
    account_number: string,
    currency: string,
    res: Response,
    walletId: string
  ) {
    const legitTypes = ["nuban", "mobile_money", "basa", "ghipss"];

    if (!legitTypes.includes(type)) {
      throw new BadRequestResponse(
        `allowed types are only "nuban", "mobile_money", "basa", "ghipss`
      ).send(res);
    }

    if (type === "nuban") {
      const resolveAccount = await PaystackService.resolveAccountNumber(
        account_number,
        bank_code
      );

      if (!resolveAccount.success) {
        throw new BadRequestResponse(resolveAccount.account.message).send(res);
      }
    }

    const receipient = await PaystackService.createTransactionReceipt(
      type,
      name,
      account_number,
      bank_code,
      currency
    );

    if (!receipient.success) {
      throw new BadRequestResponse(
        receipient?.response?.message ?? receipient.message
      ).send(res);
    }

    const existing_recipient = await WithdrawMethod.findOne({
      recipient_code: receipient?.response?.data.recipient_code,
      wallet: walletId,
    });

    if (existing_recipient) {
      throw new BadRequestResponse("recipient already exists").send(res);
    }

    return receipient;
  }

  public static async onboardSellerPaystack(
    wallet: WalletDocument | undefined,
    type: any,
    holderName: string,
    account_number: string,
    bank_code: string,
    bankName: string,
    currency: string,
    res: Response,
    alias: string
  ) {
    try {
      if (!wallet) throw new BadRequestResponse("Invalid wallet").send(res);

      const existingMethods = await WithdrawMethod.find({
        wallet: wallet._id,
        gateway: WithdrawGateway.PAYSTACK,
      }).sort({ createdAt: -1 });
      if (existingMethods.length != 0) {
        throw new BadRequestResponse(
          "wallet is already oboarded as a seller"
        ).send(res);
      }

      const paystackCurrencies = ["NGN", "GHS"];

      if (!paystackCurrencies.includes(currency)) {
        throw new BadRequestResponse(
          `allowed currencies are only "NGN", "GHS"`
        ).send(res);
      }

      const SupportedCurrency =
        await SupportedCurrencyService.getSingleBySymbol(currency);

      if (!SupportedCurrency) {
        throw new BadRequestResponse("currency is not supported").send(res);
      }

      const receipient = await this.resolveRecipient(
        type,
        holderName,
        bank_code,
        account_number,
        currency,
        res,
        wallet._id
      );

      await WithdrawMethod.create({
        type,
        bank_code,
        accountNumber: account_number,
        holderName: holderName,
        bankName,
        currency: SupportedCurrency._id,
        wallet: wallet._id,
        recipient_code: receipient.response?.data?.recipient_code,
        gateway: WithdrawGateway.PAYSTACK,
      });

      return receipient;
    } catch (error) {
      throw new BadRequestResponse(`Something went wrong ${error}`).send(res);
    }
  }

  public static async changeOTPStatus(action: boolean, res: Response) {
    const otpStatus = await PaystackService.changeOTPStatus(action);

    if (!otpStatus.success) {
      throw new BadRequestResponse(
        otpStatus.status.message ?? "something went wrong"
      ).send(res);
    }

    return otpStatus;
  }

  public static async confirmChangeOTPDisable(otp: string, res: Response) {
    const otpStatus = await PaystackService.completeOTPDisable(otp);

    if (!otpStatus.success) {
      throw new BadRequestResponse(
        otpStatus.message ?? "something went wrong"
      ).send(res);
    }

    return otpStatus;
  }

  public static async saveCard(
    wallet: WalletDocument | undefined,
    cardNumber: string = "4242424242424242",
    expireMonth: number = 8,
    expireYear: number = 2023,
    cvc: string = "314",
    res: Response
  ) {
    if (!wallet) throw new BadRequestResponse("Invalid wallet").send(res);
    let paymentCard;
    let attachPaymentMethod;

    const isCardExist = await PaymentCard.findOne({ card_number: cardNumber });
    if (isCardExist)
      throw new BadRequestResponse(
        "A payment card has already been created"
      ).send(res);

    let isStripeCustomerValid = true;
    if (!wallet?.stripe_customer_id || wallet?.stripe_customer_id === "") {
      isStripeCustomerValid = false;
    } else {
      try {
        const customer = await stripe.customers.retrieve(
          wallet.stripe_customer_id
        );
        if (!customer?.id) isStripeCustomerValid = false;
      } catch (e) {
        isStripeCustomerValid = false;
      }
    }
    if (!isStripeCustomerValid) {
      const customer = await stripe.customers.create({
        email: process.env.ADMIN_EMAIL,
        metadata: {
          id: wallet?._id,
        },
      });
      wallet.stripe_customer_id = customer.id;
      await Wallet.findByIdAndUpdate(wallet?._id, {
        stripe_customer_id: customer.id,
      });
    }
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: cardNumber,
        exp_month: expireMonth,
        exp_year: expireYear,
        cvc: cvc,
      },
    });
    if (!paymentMethod)
      throw new BadRequestResponse("Error creating payment method").send(res);
    attachPaymentMethod = await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: wallet.stripe_customer_id,
    });
    paymentCard = await PaymentCard.create({
      walletId: wallet._id,
      payment_card_id: paymentMethod.id,
      card_number: cardNumber,
      cvc: cvc,
      expireMonth,
      expireYear,
      for: CARD_TYPE.STRIPE,
    });

    return { paymentCard, attachPaymentMethod };
  }

  public static async aggregateArray(
    queryParams: Request["query"],
    predefinedValues: any,
    ignoreKeys: string[],
    custom?: any
  ) {
    const matchArray: any = [];
    if (custom) {
      matchArray.push(custom);
    }

    for (const key in predefinedValues) {
      if (
        predefinedValues.hasOwnProperty(key) &&
        !queryParams.hasOwnProperty(key) &&
        !ignoreKeys.includes(key)
      ) {
        const value = predefinedValues[key];

        if (Array.isArray(value)) {
          matchArray.push({ $match: { [key]: { $in: value } } });
        } else {
          matchArray.push({ $match: { [key]: value } });
        }
      }
    }

    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key) && !ignoreKeys.includes(key)) {
        let value: any = queryParams[key];

        if (predefinedValues.hasOwnProperty(key)) {
          matchArray.push({
            $match: {
              [key]: Array.isArray(value) ? { $in: value } : value,
            },
          });
        } else if (Array.isArray(value)) {
          value = value.map((element) => {
            const parsedNumber = parseFloat(element);
            return isNaN(parsedNumber) ? element : parsedNumber;
          });
          matchArray.push({ $match: { [key]: { $in: value } } });
        } else {
          const parsedNumber = parseFloat(value);
          if (!isNaN(parsedNumber)) {
            value = parsedNumber;
          }
          matchArray.push({ $match: { [key]: value } });
        }
      }
    }

    return matchArray;
  }

  /**
   * this function get all trades and the transaaction of the trade
   * A trade is created before transaction why purhasing a token but the
   * reverse is the case for selling token.
   * @param query | page | limit | type | status
   * @param walletId
   * @returns trade | transaction | wallet
   */
  public static async getransactions(query: Request["query"], custom?: any) {
    let typeArray: TransactionType[] | string[] = [
      TransactionType.NFT,
      TransactionType.XRP,
      TransactionType.SELL,
      TransactionType.BUY,
      TransactionType.OTHER,
      TransactionType.SWAP,
      TransactionType.REFUND,
      TransactionType.AIRTIME_TOPUP,
    ];

    const predefinedValues: any = {
      type: typeArray,
    };

    const matchData: any = await this.aggregateArray(
      query,
      predefinedValues,
      this.ignoreKeys,
      custom
    );

    const transactions = await PaginationService.paginateAggregate(
      query,
      Transaction,
      [
        ...matchData,
        {
          $lookup: {
            from: "wallets",
            localField: "senderId",
            foreignField: "_id",
            as: "sender",
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "wallets",
            localField: "receiverId",
            foreignField: "_id",
            as: "receiver",
          },
        },
        {
          $lookup: {
            from: "trade",
            localField: "_id",
            foreignField: "transactionId",
            as: "trade",
          },
        },
        {
          $project: {
            "sender.password": 0,
            "sender.accounts": 0,
            "sender.enableNotification": 0,
            "sender.notificationToken": 0,
            "sender.account_recovery_words": 0,

            "receiver.password": 0,
            "receiver.accounts": 0,
            "receiver.enableNotification": 0,
            "receiver.notificationToken": 0,
            "receiver.account_recovery_words": 0,
          },
        },
      ]
    );
    return { transactions, matchData };
  }
}

export default WalletService;
