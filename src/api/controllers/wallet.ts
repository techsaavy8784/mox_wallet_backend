import { Request, Response } from "express";
import asyncHandler from "../../helpers/asyncHandler";
import {
  AuthFailureResponse,
  BadRequestResponse,
  NotFoundResponse,
  SuccessResponse,
  FailureMsgResponse,
  BadRequestDataResponse,
} from "../../core/ApiResponse";
import WalletService from "../../services/wallet_service";
import ATservice from "../../services/africastalking.service";
import { matchedData, validationResult } from "express-validator";
import Jwt from "../../core/Jwt";
import Wallet, {
  WalletDocument,
  WalletRole,
} from "../database/models/wallet.model";
import { Types } from "mongoose";
import Account, { AccountDocument } from "../database/models/account.model";
import AccountService from "../../services/account_service";
import { generateRandomWords } from "../../helpers/generateWords";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import Devices, { DevicesDocument } from "../database/models/devices.model";
import WalletDevices from "../../api/database/models/WalletDevice.model";
import Logger from "../../core/Logger";
import PaymentCard from "../database/models/paymentCard.mode";
import { MobileMoneyType } from "../../services/flutterwaveService";
import VaultService from "../../services/vault.service";
import { generateTag } from "../../helpers/generateTag";
import crypto from "crypto";
import Vault from "../database/models/vault.model";
import { Encode, Decode } from "xrpl-tagged-address-codec";
import { levelEnum } from "../database/models/trade.model";
import Cashes from "../../api/database/models/cashe.model";
import Transaction from "../../api/database/models/transaction.model";
import TransactionService, {
  TransactionTypeFee,
} from "../../services/transaction_service";
import SupportedCurrencyService from "../../services/SupportedCurrencyService";

export interface IwalletProfileUpdate {
  notificationToken: string;
  name: string;
  enableNotification: boolean;
}

export enum AccountType {
  CUSTODIAL = "CUSTODIAL",
  NON_CUSTODIAL = "NON_CUSTODIAL",
}

export const index = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallets = await WalletService.getAll(req.query);

    return new SuccessResponse("Wallets retrieved successfully", wallets).send(
      res
    );
  }
);

export const getByEmail = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallet = await WalletService.getSingleByEmail(req.params.email);

    if (!wallet) {
      return new SuccessResponse("Wallet successfully checked", {
        found: false,
        email: req.params.email,
      }).send(res);
    }

    return new SuccessResponse("Wallet retrieved successfully", {
      found: true,
      email: req.params.email,
    }).send(res);
  }
);

export const operatorBalance = async (res: Response, currency: string) => {
  if (!process.env.ISSUER_ADDRESS) {
    throw new BadRequestResponse(`issuer address can not be found`).send(res);
  }
  const operatorAccount: AccountDocument | null = await Account.findById(
    process.env.OPERATOR_WALLET_ID
  )
    .select("+secret")
    .fill("balance")
    .fill("assets");
console.log(operatorAccount);

  if (!operatorAccount) {
    throw new BadRequestResponse(`operator account could not be found`).send(
      res
    );
  }
  const operatorCurrencyBalance = operatorAccount?.assets;
  if (!operatorCurrencyBalance?.assets) {
    throw new BadRequestResponse(`Operator has no trustline currency`).send(
      res
    );
  }
  const issuerAddress = process.env.ISSUER_ADDRESS;
  const operatorBalance = operatorCurrencyBalance?.assets[issuerAddress]?.find(
    (each: any) => each.currency === currency
  );
  console.log(operatorCurrencyBalance?.assets);
  if (!operatorBalance?.value) {
    throw new BadRequestResponse(`Operator has 0 ${currency}`).send(res);
  }

  return parseFloat(operatorBalance?.value);
};

export const operatorXRPBalance = async (res: Response) => {
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
  const operatorXRPBalance = operatorAccount?.balance;

  return parseFloat(operatorXRPBalance as string);
};

export const grandVaultBalance = async (res: Response, currency: string) => {
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
    throw new BadRequestResponse(`admin account could not be found`).send(res);
  }
  const grandVault: any = await Vault.findOne({
    isGrandVault: true,
    Wallet: operatorAccount.walletId,
  }).populate("account");

  if (!grandVault) {
    throw new BadRequestResponse(`can not find wallet vault`).send(res);
  }

  const grandVaultAccount = await Account.findById(grandVault.account._id)
    .select("+secret")
    .fill("balance")
    .fill("assets");

  const grandVaultCurrencyBalance = grandVaultAccount?.assets;
  if (!grandVaultCurrencyBalance?.assets) {
    throw new BadRequestResponse(`Grand vault has no trustline currency`).send(
      res
    );
  }
  const grandVaultBalance: any = grandVaultCurrencyBalance?.assets[
    process.env.ISSUER_ADDRESS
  ].filter((each: any) => each.currency === currency);

  if (!grandVaultBalance?.value) {
    throw new BadRequestResponse(`Operator has 0 ${currency}`).send(res);
  }

  return parseFloat(grandVaultBalance?.value);
};

export const getAdmins = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallets = await WalletService.getAdmins();

    return new SuccessResponse("admins retrieved successfully", wallets).send(
      res
    );
  }
);

export const walletNFTs = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const NFTokens = await WalletService.getWalletNFTs(req.params.xrpAddress);

    return new SuccessResponse(
      "Wallet NFTs retrieved successfully",
      NFTokens
    ).send(res);
  }
);

export const walletBalances = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const account = await AccountService.getSingle(
      req.wallet?._id,
      req.params.accountId as unknown as Types.ObjectId
    );
    const balances = await WalletService.getWalletBalances(
      account,
      res,
      req.wallet?._id
    );

    return new SuccessResponse(
      "Wallet Balances retrieved successfully",
      balances
    ).send(res);
  }
);

export const vaultBalances = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const balances = await WalletService.getAccountbalances(
      req.wallet?._id,
      res
    );

    return new SuccessResponse(
      "Vault Balances retrieved successfully",
      balances
    ).send(res);
  }
);

export const initializeAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const message = formatValidationErrors(errors.array());
        return new BadRequestResponse(message).send(res);
      }
      const words = generateRandomWords(12);
      const data = matchedData(req, { locations: ["body"] });

      const existingWallets = await Wallet.countDocuments();
      if (existingWallets !== 0) {
        return new BadRequestResponse(`has Super admin already`).send(res);
      }

      const deviceData: DevicesDocument = {
        deviceName: data.deviceName,
        osName: data.osName,
        osVersion: data.osVersion,
        deviceId: data.deviceId,
      } as DevicesDocument;

      const walletData: WalletDocument = {
        ...data,
        account_recovery_words: words,
        role: WalletRole.SUPER_ADMIN,
      } as WalletDocument;

      const { transformedWallet, device, message, mnemonic }: any =
        await WalletService.create(walletData, deviceData);

      if (!transformedWallet && !device) {
        return new AuthFailureResponse(`${message}`).send(res);
      }
      const { account } = await AccountService.createForVault(
        transformedWallet._id
      );
      if (!account.address) {
        // await Devices.findByIdAndDelete(device._id);
        await Wallet.findByIdAndDelete(transformedWallet._id);
        return new BadRequestResponse(`Something went wrong, try again`).send(
          res
        );
      }

      const token = await Jwt.issue(transformedWallet._id, "30d");

      const tag = await generateTag(words.join(" "));

      const address = Encode({ account: account.address, tag });

      const vault = await VaultService.addVault(
        transformedWallet._id,
        tag,
        address,
        true,
        account._id
      );

      await AccountService.create(transformedWallet._id, "Operator Account");

      return new SuccessResponse(message, {
        transformedWallet,
        token,
        mnemonic,
        device,
        vault,
      }).send(res);
    } catch (e) {
      console.log(e);
    }
  }
);

export const banAccount = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const { ban, walletId } = matchedData(req, { locations: ["body"] });

    const wallet = await WalletService.getSingle(walletId);

    if (!wallet) {
      return new NotFoundResponse(`could not find this wallet`).send(res);
    }

    const bannedAccount = await wallet.updateOne({
      isBanned: ban,
    });

    return new SuccessResponse(
      "successfully banned wallet",
      bannedAccount
    ).send(res);
  }
);

export const store = asyncHandler(async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const words = generateRandomWords(12);
    const data = matchedData(req, { locations: ["body"] });
    const email = data.email ? data.email.toLowerCase() : data.email;

    if (email) {
      const existingWallet = await WalletService.getSingleByEmail(email);

      if (existingWallet) {
        throw new BadRequestResponse(
          `Wallet with email ${email} already exist`
        ).send(res);
      }
    }

    const grandVault: any = await Vault.findOne({
      isGrandVault: true,
    }).populate("account");

    if (!grandVault) {
      return new BadRequestResponse(`could not find a grandVault`).send(res);
    }

    if (!grandVault?.account?.address) {
      return new BadRequestResponse(
        `Grand vault has no account asssociated`
      ).send(res);
    }

    // const deviceData: DevicesDocument = {
    //   deviceName: data.deviceName,
    //   osName: data.osName,
    //   osVersion: data.osVersion,
    //   deviceId: data.deviceId,
    // } as DevicesDocument;

    const walletData: WalletDocument = {
      ...data,
      role: WalletRole.WALLET,
      account_recovery_words: words,
    } as WalletDocument;

    const { transformedWallet, device, message, mnemonic, newWallet }: any =
      await WalletService.create(walletData);

    if (!transformedWallet && !device) {
      return new AuthFailureResponse(`${message}`).send(res);
    }

    if (data.accountType === AccountType.CUSTODIAL && newWallet) {
      await WalletService.sendEmailToCustodialWallet(
        {
          email: email,
          data: { passphrases: words },
        },
        process.env.WELCOME_EMAIL_TEMPLATE as string,
        "We have sent a Recovery key to your email"
      );
      await WalletService.sendEmailToCustodialWallet(
        {
          email: email,
          data: { passphrases: words },
        },
        process.env.WELCOME_EMAIL as string,
        "Welcome to Mox family"
      );
    }

    const tag: any = await generateTag(words.join(" "));
    const address = Encode({ account: grandVault.account.address, tag });

    const vault = await VaultService.addVault(
      transformedWallet._id,
      tag,
      address,
      false
    );

    const token = await Jwt.issue(transformedWallet._id, "30d");

    if (data.accountType === AccountType.CUSTODIAL && newWallet) {
      const pendingTxs = await Cashes.find({ recipientEmail: email });

      await Promise.all(
        pendingTxs.map(async (pendingTx) => {
          const transaction = await Transaction.findById(
            pendingTx.transactionId
          );
          if (!transaction) {
            throw new BadRequestResponse("Pending transaction not found").send(
              res
            );
          }
          const senderData = await WalletService.getSingle(
            transaction.senderId
          );

          if (!senderData) {
            throw new BadRequestResponse("senderData not found").send(res);
          }

          const SupportedCurrency =
            await SupportedCurrencyService.getSingleBySymbol(
              transaction.currency as string
            );

          if (!SupportedCurrency) {
            throw new BadRequestResponse("Currency type not supported").send(
              res
            );
          }
          const fees = await TransactionService.getFees(
            pendingTx.level,
            transaction.amount as number,
            pendingTx.level === levelEnum.WALLET
              ? TransactionTypeFee.WALLET_TO_WALLET_TRANSFER
              : TransactionTypeFee.ACCOUNT_TO_WALLET_TRANSFER,
            res
          );

          await TransactionService.endTransfer(
            transaction.senderAddress,
            tag,
            transaction,
            SupportedCurrency._id.toString(),
            transaction.currency as string,
            fees.amountToTransact,
            res,
            true,
            fees.fee,
            fees.feePercentage,
            senderData?._id.toString(),
            transaction.amount,
            senderData?.email,
            senderData?.name
          );
          await pendingTx.deleteOne();
        })
      );
    }

    return new SuccessResponse(message, {
      transformedWallet,
      token,
      mnemonic,
      device,
      vault,
    }).send(res);
  } catch (e) {
    console.log(e);
  }
});

export const validateSecretPhrase = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { secretPhrase } = matchedData(req, { locations: ["body"] });

    const isValid = await WalletService.validateSecretPhrase(
      req.wallet?._id,
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

export const importAccount = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { recoveryPhrase, osName, osVersion, deviceId, deviceName } =
      matchedData(req, {
        locations: ["body"],
      });

    if (!recoveryPhrase) {
      return new BadRequestResponse("Please provide a recovery phrase").send(
        res
      );
    }

    const account = await WalletService.import(recoveryPhrase);

    if (!account) {
      return new BadRequestResponse("Account could not be found").send(res);
    }

    // const device = await Devices.create({
    //   osName,
    //   osVersion,
    //   deviceId,
    //   deviceName,
    // });

    // await WalletDevices.create({ walletId: account._id, deviceId: device._id });

    return new SuccessResponse("Account imported", { account }).send(res);
  }
);

export const show = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallet = await WalletService.getSingle(
      req.params.walletId as unknown as string
    );
    if (!wallet) {
      return new NotFoundResponse(`could not find this wallet`).send(res);
    }
    const accounts = await AccountService.getSingleWalletAccounts(
      req.params.walletId
    );

    return new SuccessResponse("Wallet retrieved successfully", {
      wallet,
      accounts,
    }).send(res);
  }
);

export const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { password, secretPhrase } = matchedData(req, {
      locations: ["body"],
    });

    if (!secretPhrase) {
      return new BadRequestResponse("Please provide a recovery phrase").send(
        res
      );
    }

    const account = await WalletService.import(secretPhrase);

    if (!account) {
      return new BadRequestResponse("Account could not be found").send(res);
    }

    const wallet = await WalletService.changePassword(account._id, password);

    return new SuccessResponse(
      "Wallet password successfully changed",
      wallet
    ).send(res);
  }
);

export const updateProfile = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const data: IwalletProfileUpdate = req.body;
    const wallet = await WalletService.updateProfile(
      req.wallet?._id,
      data,
      req
    );
    return new SuccessResponse(
      "Wallet Profile successfully updated",
      wallet
    ).send(res);
  }
);

export const updateRole = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallet = await WalletService.updateRole(
      req.params.walletId,
      req.body.role
    );
    return new SuccessResponse("Wallet Role successfully updated", wallet).send(
      res
    );
  }
);

export const destroy = asyncHandler(async (req: Request, res: Response) => {
  try {
    const wallet = await WalletService.deleteWallet(req.wallet?._id, res);

    return new SuccessResponse(
      "Wallet account successfully deleted",
      wallet
    ).send(res);
  } catch (err) {
    return new BadRequestResponse(`Something went wrong ${err}`).send(res);
  }
});

export const getAccountByAddress = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const account = await WalletService.getAccountByAddress(
      req.params.xrpAddress
    );

    return new SuccessResponse("Account Retrieved", account).send(res);
  }
);

export const getAddressTokenRequests = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const requests = await WalletService.getTokenRequestsForAddress(
      req.params.xrpAddress
    );

    return new SuccessResponse("NFToken Requests retrieved", requests).send(
      res
    );
  }
);

export const buytokenWithStripe = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const wallet: WalletDocument | undefined = req.wallet;
    const data = matchedData(req, { locations: ["body"] });
    let requests;

    const { receiver_account_id } = req.body;

    if (!WalletService.isValidLevel(data.level, levelEnum)) {
      return new BadRequestResponse(
        `${data.level} is not a valid level value, only [WALLET, ACCOUNT]`
      ).send(res);
    }
    try {
      requests = await WalletService.buytokenWithStripe(
        data.level,
        wallet,
        data.amount,
        data.curency_symbol,
        data.payCurrency ?? data.curency_symbol,
        res,
        data.reason,
        receiver_account_id
      );
    } catch (err) {
      console.log(err);
      return res.status(400).send(err);
    }
    return new SuccessResponse(
      "Payment Intent.. You can proceed with payment",
      requests
    ).send(res);
  }
);

export const buytokenWithPaystackCard = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const {
      amount,
      cardId,
      receiver_account_id,
      curency_symbol,
      saveCard,
      level,
      reason,
      payCurrency,
    } = req.body;
    let requests;
    if (!WalletService.isValidLevel(level, levelEnum)) {
      return new BadRequestResponse(
        `${level} is not a valid level value, only [WALLET, ACCOUNT]`
      ).send(res);
    }

    try {
      requests = await WalletService.buytokenWithPaystack(
        level,
        req.wallet,
        amount,
        curency_symbol,
        payCurrency ?? curency_symbol,
        res,
        cardId,
        saveCard,
        reason,
        receiver_account_id
      );
      return new SuccessResponse("Paystack payment ongoing", requests).send(
        res
      );
    } catch (err) {
      return new BadRequestDataResponse(
        `Something went wrong ${err}`,
        requests
      ).send(res);
    }
  }
);

export const addPaystackCard = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const { currency, amount } = req.body;
    let requests;
    try {
      requests = await WalletService.addWalletPaystackCard(
        req.wallet,
        currency,
        res,
        amount
      );
      return new SuccessResponse("Paystack payment ongoing", requests).send(
        res
      );
    } catch (err) {
      return new BadRequestDataResponse(
        `Something went wrong ${err}`,
        requests
      ).send(res);
    }
  }
);

export const verifyTransaction = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const { reference } = req.params;
    try {
      const result = await WalletService.verifyPaystackTransaction(reference);
      return new SuccessResponse(
        "Paystack transaction verification result",
        result
      ).send(res);
    } catch (err) {
      console.log(err);
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
  }
);

export const stripeWebhookForBuytoken = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    let transaction;
    try {
      transaction = await WalletService.stripeWebhookForBuytoken(req.body, res);
    } catch (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    return new SuccessResponse(
      "Trade completed successfully",
      transaction
    ).send(res);
  }
);

export const paystackWebhookForBuytoken = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const hash = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET as string)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        return new NotFoundResponse(` This request isn't from paystack;`).send(
          res
        );
      }

      const transaction = await WalletService.paystackWebhookForBuytoken(
        req.body,
        res
      );
      return new SuccessResponse(
        "Trade completed successfully",
        transaction
      ).send(res);
    } catch (err) {
      console.log(err);
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
  }
);

export const createSellerAccountForStripe = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const data = matchedData(req, { locations: ["body"] });
    const wallet: WalletDocument | undefined = req.wallet;
    const account = await WalletService.createSellerAccountOnStripe(
      wallet,
      data.country,
      data.alias,
      res
    );
    return new SuccessResponse(
      "Follow the link to complete onbarding",
      account
    ).send(res);
  }
);

export const trasferFundWithStripe = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const data = matchedData(req, { locations: ["body"] });
    const { accountId, currency } = req.body;
    let transaction;
    if (!WalletService.isValidLevel(data.level, levelEnum)) {
      return new BadRequestResponse(
        `${data.level} is not a valid level value, only [WALLET, ACCOUNT]`
      ).send(res);
    }
    try {
      transaction = await WalletService.trasferFundWithStripe(
        data.level,
        req.wallet,
        data.amount,
        res,
        data.withdrawMethod,
        data.reason,
        accountId,
        currency
      );
    } catch (err) {
      console.log(err);
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
    return new SuccessResponse(
      "Trade completed successfully",
      transaction
    ).send(res);
  }
);

export const trasferFundWithPaystack = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const data = matchedData(req, { locations: ["body"] });
    const { account, currency } = req.body;
    let transaction;
    if (!WalletService.isValidLevel(data.level, levelEnum)) {
      return new BadRequestResponse(
        `${data.level} is not a valid level value, only [WALLET, ACCOUNT]`
      ).send(res);
    }
    try {
      transaction = await WalletService.trasferFundWithPaystack(
        data.level,
        req.wallet,
        data.amount,
        res,
        data.withdrawMethod,
        data.reason,
        account,
        currency
      );
    } catch (err) {
      console.log(err);
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
    return new SuccessResponse(
      "Trade completed successfully",
      transaction
    ).send(res);
  }
);

// export const trasferFundWithFLW = asyncHandler(
//   async (req: Request, res: Response): Promise<Response> => {
//     // const data = matchedData(req, { locations: ["body"] });
//     try {
//       const transaction = await WalletService.transferToBank();
//       return new SuccessResponse(
//         "Trade completed successfully",
//         transaction
//       ).send(res);
//     } catch (err) {
//       console.log(err);
//       return new BadRequestResponse(`Something went wrong ${err}`).send(res);
//     }
//   }
// );

export const saveCard = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const data = matchedData(req, { locations: ["body"] });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    let card;
    try {
      card = await WalletService.saveCard(
        req.wallet,
        data.card_number,
        data.expire_month,
        data.expire_year,
        data.cvc,
        res
      );
    } catch (err) {
      console.log(err);
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
    return new SuccessResponse("Card Created successfully", card).send(res);
  }
);

export const onboardPaystackSeller = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const data = matchedData(req, { locations: ["body"] });
    const { holderName } = req.body;
    let seller;

    try {
      seller = await WalletService.onboardSellerPaystack(
        req.wallet,
        data.type,
        holderName,
        data.account_number,
        data.bank_code,
        data.bankName,
        data.currency,
        res,
        data.alias
      );
    } catch (err) {
      console.log(err);
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
    return new SuccessResponse("seller onboarded successfully", seller).send(
      res
    );
  }
);

export const changeOTPStatus = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const data = matchedData(req, { locations: ["body"] });
    let status;
    try {
      status = await WalletService.changeOTPStatus(data.action, res);
    } catch (err) {
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
    return new SuccessResponse("status changed successfully", status).send(res);
  }
);

export const confirgOTPDisable = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const data = matchedData(req, { locations: ["body"] });
    let status;
    try {
      status = await WalletService.confirmChangeOTPDisable(data.otp, res);
    } catch (err) {
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
    return new SuccessResponse("status confirmed successfully", status).send(
      res
    );
  }
);

export const updateCard = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const data = req.body;
    try {
      const card: any = await PaymentCard.findById(req.params.cardId);
      if (!card) {
        return new NotFoundResponse(
          `card with id ${req.params.cardId} can not be found`
        ).send(res);
      }
      if (card.walletId?.toString() !== req.wallet?._id.toString()) {
        return new NotFoundResponse(`You don't have access`).send(res);
      }
      console.log(data);
      const updatedCard = await WalletService.updateWalletCards(card, data);

      return new SuccessResponse("Card Updated successfully", updatedCard).send(
        res
      );
    } catch (err) {
      console.log(err);
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
  }
);

export const deleteCard = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const card: any = await PaymentCard.findById(req.params.cardId);
      if (!card) {
        return new NotFoundResponse(
          `card with id ${req.params.cardId} can not be found`
        ).send(res);
      }
      if (card.walletId?.toString() !== req.wallet?._id.toString()) {
        return new NotFoundResponse(`You don't have access`).send(res);
      }
      await WalletService.removeWalletCards(card);
    } catch (err) {
      console.log(err);
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
    return new SuccessResponse("Card Updated successfully", {}).send(res);
  }
);

export const getWalletCards = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const cards = await WalletService.getWalletCards(req.params.walletId);
      return new SuccessResponse("Card fetched successfully", cards).send(res);
    } catch (err) {
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
  }
);

export const getTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    let transactions;
    try {
      const { accountId, level, direction }: any = req.query;

      let custom: any = {
        $match: {
          $or: [],
        },
      };

      if (!WalletService.isValidLevel(level, levelEnum)) {
        return new BadRequestResponse(
          `${level} is not a valid level value, only [WALLET, ACCOUNT]`
        ).send(res);
      }

      if (!direction) {
        return new BadRequestResponse(`direction is required`).send(res);
      }

      if (level == levelEnum.ACCOUNT) {
        const account = await Account.findOne({
          _id: accountId,
          walletId: req.wallet?._id,
        });
        if (!account) {
          throw new BadRequestResponse("Account not found").send(res);
        }

        if (direction == "in") {
          // custom["$match"]["$or"].push({ receiverAccount: account._id });
          custom["$match"]["$or"].push({ receiverAddress: account.address });
        }
        if (direction == "out") {
          custom["$match"]["$or"].push({ senderAddress: account.address });
          // custom["$match"]["$or"].push({ senderAccount: account._id });
        }
        if (direction == "all") {
          // custom["$match"]["$or"].push({ receiverAccount: account._id });
          custom["$match"]["$or"].push({ receiverAddress: account.address });
          custom["$match"]["$or"].push({ senderAddress: account.address });
          // custom["$match"]["$or"].push({ senderAccount: account._id });
        }
      }
      if (level == levelEnum.WALLET) {
        const walletVault: any = await Vault.findOne({
          Wallet: req.wallet?._id,
        })
          .populate("transactions")
          .sort({ createdAt: -1 });
        if (!walletVault) {
          throw new BadRequestResponse("could not find vault").send(res);
        }
        if (direction == "in") {
          custom["$match"]["$or"].push({
            receiverAddress: walletVault.address,
          });
        }
        if (direction == "out") {
          custom["$match"]["$or"].push({ senderAddress: walletVault.address });
        }
        if (direction == "all") {
          custom["$match"]["$or"].push({
            receiverAddress: walletVault.address,
          });
          custom["$match"]["$or"].push({ senderAddress: walletVault.address });
        }
      }

      transactions = await WalletService.getransactions(req.query, custom);
    } catch (err) {
      console.log(err);
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
    return new SuccessResponse("Wallet Transactions  successfully", {
      transactions,
    }).send(res);
  }
);

export const topUpAT = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const { currency, phoneNumber, amount, level, reason } = matchedData(req, {
      locations: ["body"],
    });
    const { accountId } = req.body;
    if (!WalletService.isValidLevel(level, levelEnum)) {
      return new BadRequestResponse(
        `${level} is not a valid level value, only [WALLET, ACCOUNT]`
      ).send(res);
    }
    try {
      const requests = await WalletService.airtimeTopUp(
        req.wallet,
        level,
        amount,
        currency,
        phoneNumber,
        res,
        reason,
        accountId
      );
      return new SuccessResponse("AT top up ongoing", requests).send(res);
    } catch (err) {
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
  }
);
