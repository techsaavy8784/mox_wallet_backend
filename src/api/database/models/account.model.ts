import mongoose, { Date } from "mongoose-fill";
import bcrypt from "bcrypt";
import { TransactionDocument } from "./transaction.model";
import ripple from "mox-ripple";
import { Types } from "mongoose";
import { DistributionDocument } from "./distribution.model";
import { environment, issuerAddress, rippleNetwork } from "../../../config";

export interface AccountDocument extends mongoose.Document {
  _id: any;
  walletId: Types.ObjectId;
  name: string;
  password: string;
  address: string;
  secret: string;
  balance: string | number;
  assets: any;
  account_recovery_words: [];
  transactions: TransactionDocument[];
  beneficiaries: { name: string; account: string }[];
  createdAt: Date;
  updatedAt: Date;
  distributions: DistributionDocument[];
  isBanned: boolean;
}

const RippleService = new ripple(
  rippleNetwork,
  environment as string,
  issuerAddress as string
);

const AccountSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },
    distributions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Distribution",
        },
      ],
    },
    name: {
      type: String,
      default: "Account 1",
    },
    password: {
      type: String,
    },
    address: {
      type: String,
      default: "",
    },
    secret: {
      type: String,
      default: "",
      select: false,
    },
    publicKey: {
      type: String,
      default: "",
      select: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    privateKey: {
      type: String,
      default: "",
      select: false,
    },
    account_recovery_words: {
      type: Array,
      select: false,
    },
    transactions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Transaction",
        },
      ],
    },
    beneficiaries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Beneficiary",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// eslint-disable-next-line no-unused-vars
AccountSchema.fill("balance", async function (this: AccountDocument, callback) {
  let balance = "0.00";
  let assets;

  try {
    balance = await RippleService.getAccountBalance(this.address);
    assets = await RippleService.getAccountAssets(this.address);
  } catch (error) {}

  this.balance = balance;
  this.assets = assets;
  callback();
});

AccountSchema.fill("assets", async function (this: AccountDocument, callback) {
  let assets;

  try {
    assets = await RippleService.getAccountAssets(this.address);
  } catch (error) {
    console.log(error);
  }

  this.assets = assets;
  callback();
});

AccountSchema.pre("save", async function (next) {
  let account = this as AccountDocument;

  // only hash the password if it has not been modified
  if (!account.isModified("password")) return next();

  // random additional data
  let saltWorkFactor = 10;
  const salt = await bcrypt.genSalt(saltWorkFactor);

  const hash = bcrypt.hashSync(account.password, salt);

  // replace the password with the hash
  account.password = hash;
  return next();
});

AccountSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  const account = this as AccountDocument;

  return bcrypt
    .compare(candidatePassword, account.password)
    .catch((e) => false);
};

const Account = mongoose.model("Account", AccountSchema);

export default Account;
