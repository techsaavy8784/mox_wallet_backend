import mongoose, { Types } from "mongoose";

export interface DistributionDocument extends mongoose.Document {
  walletId: Types.ObjectId;
  adminAccountId: Types.ObjectId;
  amount: number;
  currency: string;
}

const DistributionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    adminAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportedCurrencies",
    },
    amount: {
      type: Number,
    },
  },
  { timestamps: true }
);

const Distribution = mongoose.model("Distribution", DistributionSchema);

export default Distribution;
