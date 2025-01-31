import asyncHandler from "../../helpers/asyncHandler";
import { Request, Response } from "express";
import {
  BadRequestResponse,
  NotFoundResponse,
  SuccessMsgResponse,
  SuccessResponse,
} from "../../core/ApiResponse";
import NotificationService from "../../services/notification_service";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import { matchedData, validationResult } from "express-validator";
import { Types } from "mongoose";

export const index = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const notifications = await NotificationService.getAll();

    return new SuccessResponse(
      "Notifications successfully fetched",
      notifications
    ).send(res);
  }
);

export const getAllNotificationsForSingleWallet = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const notifications = await NotificationService.getAllForSingleWallet(
      req.params?.walletId
    );

    return new SuccessResponse(
      "Notifications successfully fetched",
      notifications
    ).send(res);
  }
);

export const store = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { title, message } = matchedData(req, { locations: ["body"] });

    const notification = await NotificationService.addNotification(
      req.wallet?._id,
      title,
      message
    );

    return new SuccessResponse(
      "Notification successfully added",
      notification
    ).send(res);
  }
);

export const show = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const notification = await NotificationService.getSingle(
      req.params.notificationId as unknown as Types.ObjectId
    );

    return new SuccessResponse(
      "Notification successfully fetched",
      notification
    ).send(res);
  }
);

export const destroy = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const oneNotification = await NotificationService.getSingle(
      req.params.notificationId as unknown as Types.ObjectId
    );

    if (!oneNotification) {
      return new NotFoundResponse(`Cannot find notification`).send(res);
    }

    const notification = await NotificationService.deleteNotification(
      req.params.notificationId
    );

    return new SuccessResponse(
      "Notification successfully deleted",
      notification
    ).send(res);
  }
);

export const markAsRead = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const oneNotification = await NotificationService.getSingle(
      req.params.notificationId as unknown as Types.ObjectId
    );

    if (!oneNotification) {
      return new NotFoundResponse(`Cannot find notification`).send(res);
    }

    const notification = await NotificationService.markNotificationAsRead(
      req.params.notificationId
    );

    return new SuccessResponse(
      "Notification successfully marked as read",
      notification
    ).send(res);
  }
);

export const bulkMarkAsRead = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { notificationIds } = matchedData(req, { locations: ["body"] });

    try {
      await NotificationService.bulkMarkAsRead(notificationIds);

      return new SuccessMsgResponse(
        "Notifications successfully marked as read"
      ).send(res);
    } catch (err) {
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
  }
);

export const bulkDelete = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }

    const { notificationIds } = matchedData(req, { locations: ["body"] });

    try {
      await NotificationService.bulkDelete(notificationIds);

      return new SuccessMsgResponse(
        "Notifications successfully marked as read"
      ).send(res);
    } catch (err) {
      return new BadRequestResponse(`Something went wrong ${err}`).send(res);
    }
  }
);
