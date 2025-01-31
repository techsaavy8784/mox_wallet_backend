import mongoose from "mongoose";

export interface DevicesDocument extends mongoose.Document {
  deviceName: string;
  osName: string;
  osVersion: string;
  deviceId: string;
}

const DevicesSchema = new mongoose.Schema(
  {
    deviceName: {
      type: String,
    },
    osName: {
      type: String,
    },
    osVersion: {
      type: String,
    },
    deviceId: {
      type: String,
    },
  },
  { timestamps: true }
);

const Devices = mongoose.model("Devices", DevicesSchema);

export default Devices;
