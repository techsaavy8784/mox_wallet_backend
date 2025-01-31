import mongoose from "mongoose";

export interface BeneficiaryDocument extends mongoose.Document {
  account: mongoose.Schema.Types.ObjectId;
  name: string;
  address: string;
}

const BeneficiarySchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Beneficiary = mongoose.model("Beneficiary", BeneficiarySchema);

export default Beneficiary;
