import { body, check, param } from "express-validator";

export const secretPhraseValidator = [
  check("secretPhrase")
    .notEmpty()
    .withMessage("Secret phrase field cannot be empty")
    .isString()
    .withMessage("Secret phrase must be a string"),
];

export const addNameValidator = [
  check("name")
    .notEmpty()
    .withMessage("Name field cannot be empty")
    .isString()
    .withMessage("Name must be a string"),
];

export const banAccountValidator = [
  check("address")
    .notEmpty()
    .withMessage("address field cannot be empty")
    .isString()
    .withMessage("address must be a string"),
  check("ban")
    .notEmpty()
    .withMessage("ban field cannot be empty")
    .isBoolean()
    .withMessage("ban must be a Boolean"),
];

export const banWalletValidator = [
  check("walletId")
    .notEmpty()
    .withMessage("walletId field cannot be empty")
    .isString()
    .withMessage("walletId must be a string"),
  check("ban")
    .notEmpty()
    .withMessage("ban field cannot be empty")
    .isBoolean()
    .withMessage("ban must be a Boolean"),
];

export const issueTokenValidator = [
  // body('contractOwnerAddress').notEmpty().withMessage('Contract Owner Address cannot be empty!'),
];

export const importValidator = [
  check("secretKey")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Secret key must be a string"),
  check("recoveryPhrase")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Recovery phrase must be a string"),
];

export const addBeneficiaryValidator = [
  check("name")
    .isString()
    .withMessage("Name must be a string")
    .notEmpty()
    .withMessage("Name cannot be empty"),
  check("address")
    .isString()
    .withMessage("Address must be a string")
    .notEmpty()
    .withMessage("Address field cannot be empty"),
];

export const addressValidator = [
  param("address").notEmpty().withMessage("Address parameter cannot be empty"),
];
