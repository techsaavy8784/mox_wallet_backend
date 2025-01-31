import mongoose from "mongoose";

export enum GENDER {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export interface PaymentRequestDocument extends mongoose.Document {
  Wallet: mongoose.Schema.Types.ObjectId;
}

export enum PaymentRequestStatus {
  APPROVED = "APPROVED",
  PENDING = "PENDING",
  DECLINED = "DECLINED",
}

const PaymentRequestSchema = new mongoose.Schema(
  {
    Wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    toWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    amount: {
      type: Number,
    },
    payer: {
      type: Number,
    },
    requester: {
      type: Number,
    },
    currencySymbol: {
      type: String,
      require: true,
    },
    reason: {
      type: String,
    },
    PaymentRequestStatus: {
      type: String,
      enum: [
        PaymentRequestStatus.APPROVED,
        PaymentRequestStatus.DECLINED,
        PaymentRequestStatus.PENDING,
      ],
      default: PaymentRequestStatus.PENDING,
    },
  },
  { timestamps: true }
);

const PaymentRequest = mongoose.model("PaymentRequest", PaymentRequestSchema);

export default PaymentRequest;
