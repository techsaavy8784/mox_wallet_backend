import Account, { AccountDocument } from "../api/database/models/account.model";
import { generateRandomWords } from "../helpers/generateWords";
import bcrypt from "bcrypt";
import { Types } from "mongoose";
import { ImportType } from "../helpers/enums";
import { BadRequestError, NotFoundError } from "../core/ApiError";
import * as xrpl from "xrpl";
import { WalletDocument } from "../api/database/models/wallet.model";
import Beneficiary from "../api/database/models/beneficiary.model";
import { BadRequestResponse } from "../core/ApiResponse";
import { Response, Request } from "express";
import PaginationService from "./paginate";
import NotificationService from "./notification_service";
import ripple from "mox-ripple";
import { environment, issuerAddress, rippleNetwork } from "../config";
import Vault from "../api/database/models/vault.model";

interface AccountData {
  secretPhrase: string[];
  account: AccountDocument;
}
const RippleService = new ripple(
  rippleNetwork,
  environment as string,
  issuerAddress as string
);

class AccountService {
  public static async getAll(): Promise<AccountDocument[] | []> {
    return await Account.find().fill("assets").sort({ createdAt: -1 });
  }
  public static async getAllPaginated(query: Request["query"]) {
    const accounts = await PaginationService.paginateAggregate(query, Account, [
      {
        $project: {
          account_recovery_words: 0,
        },
      },
    ]);
    return accounts;
  }

  public static async create(
    walletId: string,
    name?: string
  ): Promise<AccountData> {
    const words = generateRandomWords(12);

    const accounts = await AccountService.getSingleWalletAccounts(walletId);

    let account = await Account.create({
      name: name ?? `Account ${accounts.length + 1}`,
      walletId: walletId,
      account_recovery_words: words,
    });

    await this.generateAddress(account._id, walletId);

    account = await Account.findById(account._id).select(
      "+account_recovery_words"
    );

    return { account, secretPhrase: words };
  }

  public static async createForVault(
    accountAccountAddress: string
  ): Promise<AccountData> {
    const words = generateRandomWords(12);

    let account = await Account.create({
      name: `grand vault account`,
      walletId: accountAccountAddress,
      account_recovery_words: words,
    });

    await this.generateAddress(account._id, accountAccountAddress);

    account = await Account.findById(account._id).select(
      "+account_recovery_words"
    );

    return { account, secretPhrase: words };
  }

  public static async getSingle(
    walletId: Types.ObjectId,
    accountId: Types.ObjectId
  ): Promise<AccountDocument> {
    return await Account.findOne({ _id: accountId, walletId })
      .populate("transactions")
      .fill("balance")
      .fill("assets");
  }
  public static async getSingleById(
    accountId: Types.ObjectId
  ): Promise<AccountDocument> {
    return await Account.findOne({ _id: accountId })
      .populate("transactions")
      .fill("balance")
      .fill("assets");
  }

  public static async validateSecretPhrase(
    accountId: string,
    secretPhrase: Array<String>
  ): Promise<Boolean> {
    const account = await Account.findById(accountId);

    if (account) {
      return (
        JSON.stringify(account.account_recovery_words) ===
        JSON.stringify(secretPhrase)
      );
    }

    return false;
  }

  public static async createPassword(accountId: string, password: string) {
    const account = await Account.findById(accountId);

    // random additional data
    let saltWorkFactor = 10;
    const salt = await bcrypt.genSalt(saltWorkFactor);

    const hash = bcrypt.hashSync(password, salt);

    const updatedAccount = await account.updateOne({ password: hash });

    return updatedAccount;
  }

  public static async generateAddress(accountId: string, walletId: string) {
    try {
      const account = await Account.findById(accountId);

      const { classicAddress, seed, publicKey, privateKey } =
        await RippleService.generateAccount();

      await account.updateOne({
        address: classicAddress,
        secret: seed,
        publicKey,
        privateKey,
      });

      await NotificationService.addNotification(
        walletId,
        `Created Account`,
        `You have successfully created an account with address ${classicAddress}}`
      );

      return { address: classicAddress, secret: seed };
    } catch (e) {
      console.log(e);
      await Account.findByIdAndDelete(accountId);
    }
  }

  public static async addName(accountId: string, name: string) {
    const account = await Account.findById(accountId);

    const updatedAccount = await account.updateOne({ name: name });

    return updatedAccount;
  }

  public static async getSingleWalletAccounts(walletId: string) {
    return await Account.find({ walletId })
      .populate("walletId")
      .fill("balance")
      .fill("assets")
      .sort({ createdAt: -1 });
  }

  public static async deleteSingle(id: Types.ObjectId) {
    return await Account.findByIdAndDelete(id);
  }

  public static async import(
    wallet: WalletDocument,
    identifier: string,
    importType: ImportType
  ): Promise<AccountDocument> {
    let XRPAccount!: any;
    let account!: AccountDocument;

    if (importType === ImportType.RecoveryPhrase) {
      const recoveryWords = identifier.split(" ");

      account = await Account.findOne({
        account_recovery_words: recoveryWords,
      }).select("+secret");

      if (!account) {
        throw new NotFoundError("Account not found");
      }
    } else {
      account = await Account.findOne({
        secret: identifier,
      }).select("+secret");

      if (account) {
        throw new BadRequestError("Account already exists");
      }

      XRPAccount = await RippleService.resolveAccountFromSecret(identifier);

      const words = generateRandomWords(12);

      account = await Account.create({
        name: `Account ${wallet.accounts.length + 1}`,
        address: XRPAccount.address,
        walletId: wallet._id,
        account_recovery_words: words,
        secret: XRPAccount.seed,
        privateKey: XRPAccount.privateKey,
        publicKey: XRPAccount.publicKey,
      });

      const walletAccounts = wallet.accounts;

      await wallet.updateOne({ accounts: [...walletAccounts, account._id] });

      account = await Account.findById(account._id)
        .select("+account_recovery_words")
        .fill("balance")
        .fill("assets");
    }
    return account;
  }

  public static async addBeneficiary(
    walletId: string,
    name: string,
    address: string,
    accountId?: string
  ) {
    const existingBeneficiary = await Beneficiary.findOne({
      address,
      walletId,
    });

    if (existingBeneficiary) {
      throw new BadRequestError("Beneficiary already exists");
    }

    let beneficiaryData: any = {
      walletId,
      name,
      address,
    };
    if (accountId !== "undefined" && accountId !== undefined) {
      beneficiaryData.account = accountId;
    }

    let newBeneficiary = await Beneficiary.create(beneficiaryData);

    if (accountId !== "undefined" && accountId !== undefined) {
      const account = await Account.findById(accountId);

      if (!account) {
        newBeneficiary.deleteOne();
        throw new NotFoundError("Account not found");
      }

      const beneficiaries = account.beneficiaries;

      await account.updateOne(
        {
          beneficiaries: [...beneficiaries, newBeneficiary._id],
        },
        { new: true }
      );
    }

    return beneficiaryData;
  }

  public static async updateBeneficiary(
    beneficiaryId: Types.ObjectId,
    name: string,
    address: string
  ) {
    const existingBeneficiary = await Beneficiary.findById(beneficiaryId);

    if (!existingBeneficiary) {
      throw new BadRequestError("Beneficiary does not exist");
    }

    let updatedBeneficiary = await existingBeneficiary.updateOne({
      name,
      address,
    });

    return updatedBeneficiary;
  }

  public static async deleteBeneficiary(beneficiaryId: Types.ObjectId) {
    const existingBeneficiary = await Beneficiary.findById(beneficiaryId);

    if (!existingBeneficiary) {
      throw new BadRequestError("Beneficiary does not exist");
    }
    return await existingBeneficiary.deleteOne();
  }

  public static async banAccount(address: string, ban: boolean) {
    const existingAccount = await Account.findOne({
      address,
    });

    if (!existingAccount) {
      throw new BadRequestError("Account does not exist");
    }

    let updatedAccount = await existingAccount.updateOne({
      isBanned: ban,
    });

    return updatedAccount;
  }

  public static async getBeneficiaries(
    walletId: Types.ObjectId,
    res: Response,
    accountId?: string
  ) {
    if (accountId) {
      const account = await Account.findOne({ _id: accountId, walletId });

      if (account.walletId.toString() != walletId.toString()) {
        throw new BadRequestResponse(`no access to this account`).send(res);
      }
    }

    return await Beneficiary.find({ walletId }).sort({ createdAt: -1 });
  }
}

export default AccountService;
