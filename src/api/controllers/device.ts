import asyncHandler from "../../helpers/asyncHandler";
import { Request, Response } from "express";
import {
  BadRequestResponse,
  NotFoundResponse,
  SuccessResponse,
} from "../../core/ApiResponse";
import DeviceService from "../../services/device.service";
import { matchedData, validationResult } from "express-validator";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import WalletDevices from "../../api/database/models/WalletDevice.model";
import Wallet from "../../api/database/models/wallet.model";

export const index = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const Devices = await DeviceService.getAll(req.query);

    return new SuccessResponse("Devices successfully fetched", Devices).send(
      res
    );
  }
);

export const getAllDevicesForSingleWallet = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const Devices = await DeviceService.getAllForSingleWallet(req.wallet?._id);

    return new SuccessResponse("Devices successfully fetched", Devices).send(
      res
    );
  }
);

export const checkIfDeviceExist = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const { deviceId } = req.params;
    const device = await DeviceService.checkSingleDevice(deviceId);

    const walletDevice = await WalletDevices.findOne({ deviceId: device?._id });

    if (!walletDevice) {
      return new NotFoundResponse("Device not connected to any wallet").send(
        res
      );
    }

    const wallet = await Wallet.findById(walletDevice?.walletId);

    if (!device) {
      return new SuccessResponse("Device successfully checked", {
        found: false,
        deviceId,
        wallet,
      }).send(res);
    }

    return new SuccessResponse("Device successfully checked", {
      found: true,
      deviceId,
      wallet,
    }).send(res);
  }
);

export const show = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const device = await DeviceService.getSingle(req.params.deviceId);
    if (!device) {
      return new NotFoundResponse(
        `There is no such device for this wallet`
      ).send(res);
    }
    return new SuccessResponse("device successfully fetched", device).send(res);
  }
);

export const changeStatus = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const { status } = req.body;
    const device: any = await DeviceService.getForSingleWallet(
      req.wallet?._id,
      req.params.deviceId
    );
    if (!device) {
      return new NotFoundResponse(
        `There is no such device for this wallet`
      ).send(res);
    }
    if (device.walletId?.toString() !== req.wallet?._id.toString()) {
      return new NotFoundResponse(`You don't have access`).send(res);
    }
    const changedDevice = await DeviceService.changeStatus(
      device.deviceId,
      req.wallet?._id,
      status
    );

    return new SuccessResponse(
      "device successfully updated",
      changedDevice
    ).send(res);
  }
);

export const deleteDevice = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const device: any = await DeviceService.getForSingleWallet(
      req.wallet?._id,
      req.params.deviceId
    );
    if (!device) {
      return new NotFoundResponse(
        `There is no such device for this wallet`
      ).send(res);
    }
    if (device.walletId?.toString() !== req.wallet?._id.toString()) {
      return new NotFoundResponse(`You don't have access`).send(res);
    }
    const changedDevice = await DeviceService.deleteSingle(
      device.deviceId._id,
      req.wallet?._id
    );

    await WalletDevices.findOneAndDelete({
      deviceId: req.params.deviceId,
      walletId: req.wallet?._id,
    });

    return new SuccessResponse(
      "device successfully deleted",
      changedDevice
    ).send(res);
  }
);
