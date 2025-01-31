import mongoose from "mongoose";
import { levelEnum } from "./trade.model";

export interface CashesDocument extends mongoose.Document {
  recipientEmail: string;
  transactionId: string;
  level: levelEnum;
  account: string;
  amount: string;
  currency: string;
  reason: string;
}

const CashesSchema = new mongoose.Schema(
  {
    recipientEmail: {
      type: String,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transactions",
    },
    level: {
      type: String,
      enum: [levelEnum.WALLET, levelEnum.ACCOUNT],
      default: levelEnum.WALLET,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
  },
  { timestamps: true }
);

const Cashes = mongoose.model("Cashes", CashesSchema);

export default Cashes;
