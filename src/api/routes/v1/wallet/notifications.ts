import {
  index,
  store,
  destroy,
  markAsRead,
  show,
  bulkMarkAsRead,
} from "../../../controllers/notifications";
import { Router } from "express";
import { protect } from "../../../middlewares/v1/auth";
import {
  bulkNotificationValidator,
  notificationValidator,
} from "../../../validators/notification";

const notificationRouter = Router();

notificationRouter
  .route("/")
  .get(protect(false), index)
  .post(protect(false), notificationValidator, store);

notificationRouter
  .route("/:notificationId")
  .get(protect(false), show)
  .delete(protect(false), destroy);

notificationRouter.patch(
  "/:notificationId/mark-as-read",
  protect(false),
  markAsRead
);

notificationRouter.patch(
  "/mark-as-read/bulk",
  protect(false),
  bulkNotificationValidator,
  bulkMarkAsRead
);

notificationRouter.delete(
  "/delete/bulk",
  protect(false),
  bulkNotificationValidator,
  bulkMarkAsRead
);

export default notificationRouter;
