import mongoose, { Date } from "mongoose";

export interface NotificationDocument extends mongoose.Document {
  walletId: string;
  title: string;
  message: number;
  isRead: false;
}

const NotificationSchema = new mongoose.Schema(
  {
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
