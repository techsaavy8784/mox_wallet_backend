import mongoose, { Types } from "mongoose";

export interface PaymentCardDocument extends mongoose.Document {
  walletId: Types.ObjectId;
  payment_card_id: string;
  bin: string;
  last_4digits: string;
  cvc: string;
  expireYear: string;
  expireMonth: string;
  for: string;
  card_holder: string;
  card_number: string;
  signature: string;
  channel: string;
  country: string;
  token: string;
  type: string;
}

export enum CARD_TYPE {
  STRIPE = "stripe",
  PAYSTACK = "paystack",
}

const PaymentCardSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    payment_card_id: {
      type: String,
    },
    for: {
      type: String,
      enum: [CARD_TYPE.STRIPE, CARD_TYPE.PAYSTACK],
    },
    expireMonth: {
      type: String,
    },
    expireYear: {
      type: String,
    },
    bin: {
      type: String,
    },
    last_4digits: {
      type: String,
    },
    channel: {
      type: String,
    },
    country: {
      type: String,
    },
    type: {
      type: String,
    },
    token: {
      type: String,
    },
    signature: {
      type: String,
    },
    card_number: {
      type: String,
    },
    card_holder: {
      type: String,
    },
    cvc: {
      type: String,
    },
  },
  { timestamps: true }
);

const PaymentCard = mongoose.model("PaymentCard", PaymentCardSchema);

export default PaymentCard;
