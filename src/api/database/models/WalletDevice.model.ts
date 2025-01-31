import mongoose from "mongoose";

export interface WalletDevicesDocument extends mongoose.Document {
  walletId: mongoose.Types.ObjectId;
  deviceId: mongoose.Types.ObjectId;
}

const WalletDevicesSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Devices",
      required: true,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const WalletDevices = mongoose.model("WalletDevices", WalletDevicesSchema);

export default WalletDevices;
