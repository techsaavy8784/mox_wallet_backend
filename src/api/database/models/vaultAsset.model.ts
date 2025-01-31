import mongoose from "mongoose";
import { SupportedCurrenciesDocument } from "./supportedCurrencies";
import { VaultDocument } from "./vault.model";

export interface VaultAssetDocument extends mongoose.Document {
  SupportedCurrency: SupportedCurrenciesDocument;
  vault: VaultDocument;
  balance: number;
}

const VaultAssetSchema = new mongoose.Schema(
  {
    vault: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vault",
      required: true,
    },
    SupportedCurrency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportedCurrencies",
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const VaultAsset = mongoose.model("VaultAsset", VaultAssetSchema);

export default VaultAsset;
