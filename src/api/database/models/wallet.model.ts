import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { AccountType } from "../../../api/controllers/wallet";
import { KYCStatus } from "./kyc.model";

export interface WalletDocument extends mongoose.Document {
  password: string;
  accounts: mongoose.Types.ObjectId[];
  name: string;
  enableNotification: boolean;
  image: boolean;
  notificationToken: string;
  role: string;
  account_recovery_words: string[];
  stripe_customer_id: string;
  stripe_account_id: string;
  recipient_code: string;
  isBanned: boolean;
  accountType: AccountType;
  email: string;
  isKycOnboarded: boolean;
  kycStatus: KYCStatus;
}

export enum WalletRole {
  WALLET = "wallet",
  ADMIN = "admin",
  SUPER_ADMIN = "super-admin",
}

const WalletSchema = new mongoose.Schema(
  {
    image: {
      type: String,
    },
    notificationToken: {
      type: String,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    accountType: {
      type: String,
      enum: [AccountType.CUSTODIAL, AccountType.NON_CUSTODIAL],
      default: AccountType.NON_CUSTODIAL,
    },
    role: {
      type: String,
      enum: [WalletRole.WALLET, WalletRole.ADMIN, WalletRole.SUPER_ADMIN],
      default: WalletRole.WALLET,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    enableNotification: {
      type: Boolean,
    },
    accounts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
      },
    ],
    account_recovery_words: {
      type: Array,
      select: false,
    },
    stripe_customer_id: {
      type: String,
      required: false,
    },
    stripe_account_id: {
      type: String,
      required: false,
      default: "",
    },
    recipient_code: {
      type: String,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    isKycOnboarded: {
      type: Boolean,
      default: false,
    },
    kycStatus: {
      type: String,
      enum: [
        KYCStatus.APPROVED,
        KYCStatus.DECLINED,
        KYCStatus.PENDING,
        KYCStatus.NOT_SUBMITTED,
      ],
      default: KYCStatus.NOT_SUBMITTED,
    },
  },
  { timestamps: true }
);

WalletSchema.pre("save", async function (next) {
  let wallet = this as unknown as WalletDocument;

  // only hash the password if it has not been modified
  if (!wallet.isModified("password")) return next();

  // random additional data
  let saltWorkFactor = 10;
  const salt = await bcrypt.genSalt(saltWorkFactor);

  const hash = bcrypt.hashSync(wallet.password, salt);

  // replace the password with the hash
  wallet.password = hash;
  return next();
});

WalletSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  const wallet = this as WalletDocument;

  return bcrypt.compare(candidatePassword, wallet.password).catch((e) => false);
};

const Wallet = mongoose.model("Wallet", WalletSchema);

export default Wallet;
