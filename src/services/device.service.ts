import Devices from "../api/database/models/devices.model";
import WalletDevices from "../api/database/models/WalletDevice.model";
import PaginationService from "./paginate";
import { Request, Response } from "express";

class DevicesService {
  public static async getAll(query: Request["query"]) {
    let device;
    const devices = await PaginationService.paginateAggregate(
      query,
      Devices,
      []
    );
    return devices;
  }

  public static async getAllForSingleWallet(walletId: string) {
    const devices = await WalletDevices.find({ walletId })
      .populate("deviceId")
      .sort({ createdAt: -1 });
    return devices;
  }

  public static async getForSingleWallet(walletId: string, deviceId: string) {
    const device = await WalletDevices.findOne({ walletId, deviceId }).populate(
      "deviceId"
    );
    return device;
  }

  public static async checkSingleDevice(deviceId: string) {
    const device = await Devices.findOne({ deviceId }).populate("deviceId");
    return device;
  }

  public static async getSingle(DevicesId: string) {
    const device = await Devices.findById(DevicesId).populate("deviceId");
    return device;
  }

  public static async changeStatus(
    id: string,
    walletId: string,
    status: boolean
  ): Promise<any> {
    await WalletDevices.findOneAndUpdate(
      { deviceId: id, walletId },
      { isDisabled: status }
    );
    return this.getSingle(id);
  }

  public static async deleteSingle(id: string, walletId: string) {
    const walletdevice = await this.getForSingleWallet(walletId, id);

    if (walletdevice) {
      walletdevice?.deleteOne();
      await Devices.findByIdAndDelete(id);
    }
  }
}

export default DevicesService;
