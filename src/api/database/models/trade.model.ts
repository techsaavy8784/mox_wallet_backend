import mongoose, { Date, Schema, Types } from "mongoose";
import { WalletDocument } from "./wallet.model";
import { PayloadCardTypes } from "../../../services/flutterwaveService";

export interface TradeDocument extends mongoose.Document {
  walletId: Types.ObjectId;
  customerId: string;
  cardId: Types.ObjectId;
  paymentGatewayTransactionId: string;
  transactionId: Types.ObjectId;
  amount: number;
  status: string;
  paymentGateway: string;
  tradeType: string;
  receiverWalletId: string;
  senderWalletId: string;
  currencySymbol: string;
  payCurrency: string;
  payAmount: number;
  payRate: number;
  payFee: number;
  errorMessage: string;
  webhook_status: string;
  reference: string;
  reason: string;
  holderName: string;
  saveCard: boolean;
  xrpTransaction: boolean;
  alias: string;
  onboardCard: boolean;
  level: levelEnum;
  senderMoxId: number;
  recepientMoxId: number;
}

export enum levelEnum {
  WALLET = "WALLET",
  ACCOUNT = "ACCOUNT",
}

export enum TradeStatus {
  FAILED = "failed",
  PENDING = "pending",
  SUCCESS = "successful",
}

export enum PaymentGatewayType {
  STRIPE = "stripe",
  PAYSTACK = "paystack",
  OTHER = "other",
}

export enum TradeType {
  BUY = "buy",
  SELL = "sell",
}

const TradeSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentCard",
    },
    senderMoxId: {
      type: Number,
    },
    recepientMoxId: {
      type: Number,
    },
    customerId: {
      type: String,
      required: false,
    },
    paymentGatewayTransactionId: {
      type: String,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transactions",
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: PaymentGatewayType,
    },
    tradeType: {
      type: String,
      enum: TradeType,
    },
    status: {
      type: String,
      enum: TradeStatus,
      required: true,
    },
    receiverAccountId: {
      type: String,
      require: false,
      default: "",
    },
    senderAccountId: {
      type: String,
      require: false,
      default: "",
    },
    currencySymbol: {
      type: String,
      require: true,
    },
    payCurrency: {
      type: String,
      require: true,
    },
    payAmount: {
      type: Number,
      default: 0,
    },
    payFee: {
      type: Number,
      default: 0,
    },
    payRate: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
    },
    webhook_status: {
      type: String,
    },
    reference: {
      type: String,
    },
    reason: {
      type: String,
    },
    saveCard: {
      type: Boolean,
    },
    alias: {
      type: String,
    },
    holderName: {
      type: String,
    },
    onboardCard: {
      type: Boolean,
      default: false,
    },
    xrpTransaction: {
      type: Boolean,
      default: false,
    },
    level: {
      type: String,
      enum: [levelEnum.WALLET, levelEnum.ACCOUNT],
      default: levelEnum.WALLET,
    },
  },
  { timestamps: true }
);

const Trade = mongoose.model("Trade", TradeSchema);

export default Trade;
