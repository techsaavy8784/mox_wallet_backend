import mongoose from "mongoose";

export interface SupportedCurrenciesDocument extends mongoose.Document {
  name: string;
  symbol: string;
  supply: number;
  suppliedTokens: number;
  code: string;
}

const SupportedCurrenciesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    image: {
      type: String,
    },
    symbol: {
      type: String,
    },
    supply: {
      type: Number,
    },
    suppliedTokens: {
      type: Number,
      default: 0,
    },
    code: {
      type: String,
    },
  },
  { timestamps: true }
);

const SupportedCurrencies = mongoose.model(
  "SupportedCurrencies",
  SupportedCurrenciesSchema
);

export default SupportedCurrencies;
