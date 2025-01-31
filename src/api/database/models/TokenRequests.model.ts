import mongoose, { Date, Schema } from "mongoose";
import { WalletDocument } from "./wallet.model";

export interface TokenRequestDocument extends mongoose.Document {
  senderId: string;
  receiver: string;
  status: string;
  createdAt: Date;
  NFTokenID: string;
  NFTokenOfferIndex: string;
  transactionId: string;
  type: string;
  currencyRequest: string;
  amountRequest: number;
  senderAddress: string;
}

export enum TokenRequestStatus {
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  PENDING = "pending",
}

export enum TokenRequestType {
  NFT = "nft",
  CURRENCY = "currency",
}

const TokenRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    senderAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
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
      required: true,
    },
    NFTokenID: {
      type: String,
    },
    NFTokenOfferIndex: {
      type: String,
    },
    status: {
      type: String,
      enum: TokenRequestStatus,
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    nfts: {
      type: Array,
    },
    type: {
      type: String,
      enum: TokenRequestType,
      required: true,
    },
    senderAddress: {
      type: String,
    },
    currencyRequest: {
      type: String,
    },
    amountRequest: {
      type: Number,
    },
  },
  { timestamps: true }
);

const TokenRequest = mongoose.model("TokenRequest", TokenRequestSchema);

export default TokenRequest;
