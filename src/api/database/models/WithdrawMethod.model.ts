import mongoose, { Types } from "mongoose";
import { SupportedCurrenciesDocument } from "./supportedCurrencies";
import { WalletDocument } from "./wallet.model";

export enum WithdrawMethodTypes {
  ACH = "ACH",
  WIRE = "WIRE",
  SWIFT = "SWIFT",
  BANK = "Bank",
  MOBILE_MONEY = "mobile_money",
  NUBAN = "nuban",
  BASA = "basa",
  ghipss = "ghipss",
}

export enum WithdrawCurrencies {
  USD = "USD",
  RWF = "RWF",
  NGN = "NGN",
  GHS = "GHS",
}

export enum WithdrawGateway {
  STRIPE = "STRIPE",
  PAYSTACK = "PAYSTACK",
}
export interface IWithdrawMethod {
  email: { type: string };
  type: WithdrawMethodTypes;
  holderName: string;
  bankName?: string;
  bank_code?: string;
  routingNumber?: string;
  account_number?: string;
  accountType?: string;
  branchName?: string;
  recipient_code?: string;
  stripe_account_id: string;
  mobileMoneyProvider?: string;
  swiftCode: string;
  phoneNumber?: string;
  currency: SupportedCurrenciesDocument;
  wallet: WalletDocument;
  alias: string;
  gateway: WithdrawGateway;
}
export interface WithdrawMethodDocument
  extends IWithdrawMethod,
    mongoose.Document {}

const WithdrawMethodSchema = new mongoose.Schema({
  email: {
    type: String,
    allowNull: true,
  },
  type: {
    type: String,
    enum: [
      WithdrawMethodTypes.NUBAN,
      WithdrawMethodTypes.BASA,
      WithdrawMethodTypes.BANK,
      WithdrawMethodTypes.ACH,
      WithdrawMethodTypes.MOBILE_MONEY,
      WithdrawMethodTypes.WIRE,
      WithdrawMethodTypes.ghipss,
      WithdrawMethodTypes.SWIFT,
    ],
  },
  gateway: {
    type: String,
    enum: [WithdrawGateway.PAYSTACK, WithdrawGateway.STRIPE],
    default: WithdrawGateway.PAYSTACK,
  },
  holderName: { type: String },
  bankName: { type: String, allowNull: true },
  routingNumber: { type: String, allowNull: true },
  account_number: { type: String, allowNull: true },
  bank_code: { type: String, allowNull: true },
  accountType: { type: String, allowNull: true },
  branchName: { type: String, allowNull: true },
  mobileMoneyProvider: { type: String, allowNull: true },
  swiftCode: { type: String, allowNull: true },
  phoneNumber: { type: String, allowNull: true },
  recipient_code: { type: String, allowNull: true },
  stripe_account_id: { type: String, allowNull: true },
  wallet: { type: Types.ObjectId, ref: "Wallet" },
  alias: { type: String, allowNull: true },
  currency: {
    type: Types.ObjectId,
    ref: "SupportedCurrencies",
  },
});
const WithdrawMethod = mongoose.model("WithdrawMethods", WithdrawMethodSchema);
export default WithdrawMethod;
