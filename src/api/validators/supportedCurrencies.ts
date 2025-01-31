import { BadRequestError } from "../../core/ApiError";
import { check, body } from "express-validator";
import SupportedCurrencyService from "../../services/SupportedCurrencyService";

export const supportedCurrenciesValidator = [
  check("name")
    .notEmpty()
    .withMessage("name field cannot be empty")
    .isString()
    .withMessage("name must be a string"),
  check("symbol")
    .notEmpty()
    .withMessage("symbol field cannot be empty")
    .isString()
    .withMessage("symbol must be a string"),
  check("code")
    .notEmpty()
    .withMessage("code field cannot be empty")
    .isString()
    .withMessage("code must be a string"),
  check("supply")
    .notEmpty()
    .withMessage("supply field cannot be empty")
    .isNumeric()
    .withMessage("supply must be a number"),
];

export const distributeCurrencyValidator = [
  check("amount")
    .notEmpty()
    .withMessage("amount field cannot be empty")
    .isNumeric()
    .withMessage("name must be a number"),
  check("symbol")
    .notEmpty()
    .withMessage("symbol field cannot be empty")
    .isString()
    .withMessage("symbol must be a string"),
  check("accountId")
    .notEmpty()
    .withMessage("accountId field cannot be empty")
    .isString()
    .withMessage("accountId must be a string"),
  check("adminWalletId")
    .notEmpty()
    .withMessage("adminWalletId field cannot be empty")
    .isString()
    .withMessage("adminWalletId must be a string"),
];
export const validateSwappCurrency = [
  body("accountId").isString().withMessage("account id must be a string"),
  body("amount").isNumeric().withMessage("The amount must be a number"),
  body("baseCurrency").isString().withMessage("Base currency must be a string"),
  check("reason").optional(),
  body("targetCurrency")
    .isString()
    .withMessage("Target currency must be a string"),
];
