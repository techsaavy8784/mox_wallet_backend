import { check } from "express-validator";

export const pusherValidator = [
  check("socket_id").isString().withMessage("socket_id must be a string"),
  check("channel_name")
    .notEmpty()
    .withMessage("channel_name field cannot be empty")
    .isString()
    .withMessage("channel_name must be a string"),
];

export const pusherWebhookValidator = [
  check("time_ms").isString().withMessage("time_ms must be a string"),
  check("events").isArray().withMessage("events must be an array"),
];
