import mongoose, { Date, Schema, Types } from "mongoose";
import { WalletDocument } from "./wallet.model";

export interface TransactionDocument extends mongoose.Document {
  senderId: Types.ObjectId;
  amount: number;
  toAmount: number;
  receiverId: Types.ObjectId;
  status: string;
  type: string;
  NFTokenID: string;
  currency: string;
  hashLink: string;
  hash: string;
  errorMessage: string;
  senderMoxId: number;
  recepientMoxId: number;
  toCurrency: string;
  reason: string;
  receiverEmail: string;
}

export enum TransactionStatus {
  FAILED = "failed",
  PENDING = "pending",
  SUCCESS = "successful",
}

export enum TransactionType {
  XRP = "xrp",
  NFT = "nft",
  SELL = "sell",
  BUY = "buy",
  SWAP = "SWAP",
  AIRTIME_TOPUP = "AIRTIME_TOPUP",
  REFUND = "REFUND",
  OTHER = "other",
}

const TransactionSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    senderAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    senderMoxId: {
      type: Number,
    },
    recepientMoxId: {
      type: Number,
    },
    amount: {
      type: Number,
      required: true,
    },
    toAmount: {
      type: Number,
      default: 0,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },
    receiverAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    receiverAddress: {
      type: String,
    },
    receiverEmail: {
      type: String,
    },
    senderAddress: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: TransactionType,
    },
    NFTokenID: {
      type: String,
    },
    reason: {
      type: String,
    },
    status: {
      type: String,
      enum: TransactionStatus,
      required: true,
    },
    errorMessage: {
      type: String,
    },
    currency: {
      type: String,
    },
    toCurrency: {
      type: String,
    },
    hashLink: {
      type: String,
    },
    hash: {
      type: String,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", TransactionSchema);

export default Transaction;
