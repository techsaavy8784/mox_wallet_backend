import { check } from "express-validator";

export const notificationValidator = [
  check("title")
    .notEmpty()
    .withMessage("Title field cannot be empty")
    .isString()
    .withMessage("Title must be a string"),
  check("message")
    .notEmpty()
    .withMessage("Message field cannot be empty")
    .isString()
    .withMessage("Message must be a string"),
];

export const bulkNotificationValidator = [
  check("notificationIds")
    .notEmpty()
    .withMessage("notificationIds field cannot be empty")
    .isArray()
    .withMessage("notificationIds must be a string"),
];
