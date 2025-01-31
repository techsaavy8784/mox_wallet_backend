import { check } from "express-validator";

export const transferValidator = [
  check("recipient")
    .notEmpty()
    .withMessage("Recipient field cannot be empty")
    .isString()
    .withMessage("Recipient must be a string"),
  check("amount")
    .notEmpty()
    .withMessage("amount field cannot be empty")
    .isNumeric()
    .withMessage("amount must be a number"),
  check("level")
    .isString()
    .withMessage("level must be of type string")
    .notEmpty()
    .withMessage("level field cannot be empty"),
  check("reason").optional(),
];

export const transferNFTValidator = [
  check("account")
    .notEmpty()
    .withMessage("Account field cannot be empty")
    .isString()
    .withMessage("Account must be a string"),
  check("recipient")
    .notEmpty()
    .withMessage("Recipient field cannot be empty")
    .isString()
    .withMessage("Recipient must be a string"),
  check("tokenId")
    .notEmpty()
    .withMessage("tokenId field cannot be empty")
    .isString()
    .withMessage("tokenId must be a string"),
  check("reason").optional(),
];

export const approveValidator = [
  check("status")
    .notEmpty()
    .withMessage("status field cannot be empty")
    .isString()
    .withMessage("status must be a string"),
  check("TokenRequestId")
    .notEmpty()
    .withMessage("TokenRequestId field cannot be empty")
    .isString()
    .withMessage("TokenRequestId must be a string"),
  check("type")
    .notEmpty()
    .withMessage("type field cannot be empty")
    .isString()
    .withMessage("type must be a string"),
];
