import {
  checkIfDeviceExist,
  getAllDevicesForSingleWallet,
  changeStatus,
  show,
  deleteDevice,
} from "../../../controllers/device";
import { Router } from "express";
import { protect } from "../../../middlewares/v1/auth";

const devicesRouter = Router();

devicesRouter.get("/check/:deviceId", checkIfDeviceExist);
devicesRouter.get("/all", protect(false), getAllDevicesForSingleWallet);
devicesRouter.get("/single/:deviceId", protect(false), show);
devicesRouter.patch("/status/:deviceId", protect(false), changeStatus);
devicesRouter.delete("/:deviceId", protect(true), deleteDevice);

export default devicesRouter;
