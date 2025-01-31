import mongoose from "mongoose";

export enum GENDER {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export interface KYCDocument extends mongoose.Document {
  Wallet: mongoose.Schema.Types.ObjectId;
  country: string;
  city: string;
  idNumber: string;
  phoneNumber: string;
  gender: string;
}

export enum KYCStatus {
  APPROVED = "APPROVED",
  PENDING = "PENDING",
  DECLINED = "DECLINED",
  NOT_SUBMITTED = "NOT_SUBMITTED",
}

const KYCSchema = new mongoose.Schema(
  {
    Wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    city: {
      type: String,
    },
    idNumber: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    gender: {
      type: String,
      enum: [GENDER.MALE, GENDER.FEMALE, GENDER.OTHER],
      default: GENDER.OTHER,
    },
    kycStatus: {
      type: String,
      enum: [
        KYCStatus.APPROVED,
        KYCStatus.DECLINED,
        KYCStatus.PENDING,
        KYCStatus.NOT_SUBMITTED,
      ],
      default: KYCStatus.PENDING,
    },
  },
  { timestamps: true }
);

const KYC = mongoose.model("KYC", KYCSchema);

export default KYC;
