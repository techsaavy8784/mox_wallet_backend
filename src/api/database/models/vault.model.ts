import mongoose from "mongoose";
import { TransactionDocument } from "./transaction.model";
import { AccountDocument } from "./account.model";

export interface VaultDocument extends mongoose.Document {
  Wallet: mongoose.Schema.Types.ObjectId;
  address: string;
  tag: number;
  transactions: TransactionDocument[];
  isGrandVault: boolean;
  account: AccountDocument;
}

const VaultSchema = new mongoose.Schema(
  {
    Wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    address: {
      type: String,
      required: true,
    },
    tag: {
      type: Number,
      unique: true,
    },
    transactions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Transaction",
        },
      ],
    },
    isGrandVault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Vault = mongoose.model("Vault", VaultSchema);

export default Vault;
