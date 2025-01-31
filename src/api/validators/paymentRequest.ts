import { PaymentRequestStatus } from "../../api/database/models/paymentRequest";
import { check } from "express-validator";

const status = [PaymentRequestStatus.APPROVED, PaymentRequestStatus.DECLINED];

export const requestValidator = [
  check("payer")
    .notEmpty()
    .withMessage("payer field cannot be empty")
    .isString()
    .withMessage("payer must be a string"),
  check("currencySymbol")
    .notEmpty()
    .withMessage("currencySymbol field cannot be empty")
    .isString()
    .withMessage("currencySymbol must be a string"),
  check("reason")
    .notEmpty()
    .withMessage("reason field cannot be empty")
    .isString()
    .withMessage("reason must be a string"),
  check("amount")
    .notEmpty()
    .withMessage("amount field cannot be empty")
    .isNumeric()
    .withMessage("amount must be a number"),
];

export const statusValidator = [
  check("status")
    .isString()
    .withMessage("status  must be the string")
    .isIn(status)
    .withMessage(`status must be ${status.join()}`)
    .notEmpty()
    .withMessage("status must be provided"),
];
