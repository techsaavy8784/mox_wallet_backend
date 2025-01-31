import {
    checkIfDeviceExist
  } from "../../controllers/device";
  import { Router } from "express";
  
  const devicesRouter = Router();
  
  devicesRouter.get("/check/:deviceId", checkIfDeviceExist);

  
  export default devicesRouter;
  