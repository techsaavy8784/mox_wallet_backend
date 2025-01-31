import { AccountType } from "../../api/controllers/wallet";
import { check, body } from "express-validator";

export const createWalletValidator = [
  body("password")
    .isString()
    .withMessage("Password must be a string")
    .notEmpty()
    .withMessage("Password field cannot be empty"),
  body("accountType")
    .notEmpty()
    .withMessage("Account type is required")
    .isString()
    .isIn([AccountType.NON_CUSTODIAL, AccountType.CUSTODIAL])
    .withMessage("Account type must be NON_CUSTODIAL, CUSTODIAL"),
  body("email")
    .if(body("accountType").equals(AccountType.CUSTODIAL))
    .isString()
    .withMessage("email must be the string"),
];

export const updateWalletValidator = [
  check("secretPhrase")
    .notEmpty()
    .withMessage("Secret phrase field cannot be empty")
    .isString()
    .withMessage("Secret phrase must be a string"),
  check("password")
    .isString()
    .withMessage("Password must be a string")
    .notEmpty()
    .withMessage("Password field cannot be empty"),
];

export const newPasswordValidator = [
  check("password").notEmpty().withMessage("Password field cannot be empty"),
];

export const importValidator = [
  check("recoveryPhrase")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Recovery phrase must be a string"),
  // check("deviceName")
  //   .isString()
  //   .withMessage("deviceName must be a string")
  //   .optional()
  //   .withMessage("deviceName field cannot be empty"),
  // check("osName")
  //   .isString()
  //   .withMessage("osName must be a string")
  //   .notEmpty()
  //   .withMessage("osName field cannot be empty"),
  // check("osVersion")
  //   .isString()
  //   .withMessage("osVersion must be a string")
  //   .notEmpty()
  //   .withMessage("osVersion field cannot be empty"),
  // check("deviceId")
  //   .isString()
  //   .withMessage("deviceId must be a string")
  //   .optional(),
];

export const secretPhraseValidator = [
  check("secretPhrase")
    .notEmpty()
    .withMessage("Secret phrase field cannot be empty")
    .isString()
    .withMessage("Secret phrase must be a string"),
];

export const addPinValidator = [
  check("pin")
    .notEmpty()
    .withMessage("Pin field cannot be empty")
    .isNumeric()
    .withMessage("Pin must be a number"),
  check("tradeId")
    .notEmpty()
    .withMessage("tradeId field cannot be empty")
    .isString()
    .withMessage("tradeId must be a string"),
];

export const changeOTPSTatusValidator = [
  check("action")
    .notEmpty()
    .withMessage("action field cannot be empty")
    .isBoolean()
    .withMessage("action must be a boolean"),
];

export const confirmOTPSTatusValidator = [
  check("otp")
    .notEmpty()
    .withMessage("otp field cannot be empty")
    .isString()
    .withMessage("otp must be a string"),
];

export const addAVSValidator = [
  check("city")
    .notEmpty()
    .withMessage("city field cannot be empty")
    .isString()
    .withMessage("city must be a string"),
  check("country")
    .notEmpty()
    .withMessage("country field cannot be string")
    .isString()
    .withMessage("country must be a string"),
  check("address")
    .notEmpty()
    .withMessage("address field cannot be empty")
    .isString()
    .withMessage("address must be a string"),
  check("country")
    .notEmpty()
    .withMessage("country field cannot be empty")
    .isString()
    .withMessage("country must be a string"),
  check("state")
    .notEmpty()
    .withMessage("state field cannot be empty")
    .isString()
    .withMessage("state must be a string"),
  check("zipcode")
    .notEmpty()
    .withMessage("zipcode field cannot be empty")
    .isString()
    .withMessage("zipcode must be a string"),
  check("tradeId")
    .notEmpty()
    .withMessage("tradeId field cannot be empty")
    .isString()
    .withMessage("tradeId must be a string"),
];

export const buyTokenValidator = [
  check("amount")
    .isNumeric()
    .withMessage("amount must be of type number")
    .notEmpty()
    .withMessage("amount field cannot be empty"),
  check("email")
    .optional()
    .isEmail()
    .withMessage("invalid email")
    .notEmpty()
    .withMessage("email field cannot be empty"),
  check("curency_symbol")
    .isString()
    .withMessage("curency_symbol must be of type string")
    .notEmpty()
    .withMessage("curency_symbol field cannot be empty"),
  body("payCurrency")
    .if(body("curency_symbol").equals("XRP"))
    .isString()
    .withMessage("payCurrency must be the string")
    .notEmpty()
    .withMessage("payCurrency must be provided"),
  check("level")
    .isString()
    .withMessage("level must be of type string")
    .notEmpty()
    .withMessage("level field cannot be empty"),
  check("reason").optional(),
];

export const buyPaystackTokenValidator = [
  check("amount")
    .isNumeric()
    .withMessage("amount must be of type number")
    .notEmpty()
    .withMessage("amount field cannot be empty"),
  check("email").optional().isEmail().withMessage("invalid email"),
  check("curency_symbol")
    .isString()
    .withMessage("curency_symbol must be of type string")
    .notEmpty()
    .withMessage("curency_symbol field cannot be empty"),
  body("payCurrency")
    .if(body("curency_symbol").equals("XRP"))
    .isString()
    .withMessage("payCurrency must be the string")
    .notEmpty()
    .withMessage("payCurrency must be provided"),
  check("saveCard")
    .isBoolean()
    .withMessage("saveCard must be of type boolean")
    .notEmpty()
    .withMessage("saveCard field cannot be empty"),
  check("level")
    .isString()
    .withMessage("level must be of type string")
    .notEmpty()
    .withMessage("level field cannot be empty"),
  check("reason").optional(),
];

export const addPaystackCardValidator = [
  check("currency")
    .isString()
    .withMessage("currency must be of type string")
    .notEmpty()
    .withMessage("currency field cannot be empty"),
  check("amount")
    .isNumeric()
    .withMessage("amount must be of type number")
    .notEmpty()
    .withMessage("amount field cannot be empty"),
];

export const onboardSellerWithStripeValidator = [
  check("country").isString().withMessage("country is a string").notEmpty(),
  check("alias").optional(),
];

export const transferFundWithStripeValidator = [
  check("amount")
    .isNumeric()
    .withMessage("amount must be of type number")
    .notEmpty()
    .withMessage("amount field cannot be empty"),
  check("currency")
    .isString()
    .withMessage("curency must be of type string")
    .notEmpty()
    .withMessage("curency field cannot be empty"),
  check("level")
    .isString()
    .withMessage("level must be of type string")
    .notEmpty()
    .withMessage("level field cannot be empty"),
  check("withdrawMethod")
    .isString()
    .withMessage("withdrawMethod must be of type string")
    .notEmpty()
    .withMessage("withdrawMethod field cannot be empty"),
  check("reason").optional(),
];
export const transferFundWithPaystackValidator = [
  check("amount")
    .isNumeric()
    .withMessage("amount must be of type number")
    .notEmpty()
    .withMessage("amount field cannot be empty"),
  check("level")
    .isString()
    .withMessage("level must be of type string")
    .notEmpty()
    .withMessage("level field cannot be empty"),
  check("withdrawMethod")
    .isString()
    .withMessage("withdrawMethod must be of type string")
    .notEmpty()
    .withMessage("withdrawMethod field cannot be empty"),
  check("reason").optional(),
];
export const onboardSellerPaystackValidator = [
  check("type")
    .isString()
    .withMessage("type must be of type string")
    .notEmpty()
    .withMessage("type field cannot be empty"),
  check("name")
    .isString()
    .withMessage("name must be of type string")
    .notEmpty()
    .withMessage("name field cannot be empty"),
  check("account_number")
    .isString()
    .withMessage("account_number must be of type string")
    .notEmpty()
    .withMessage("account_number field cannot be empty"),
  check("currency")
    .isString()
    .withMessage("currency must be of type string")
    .notEmpty()
    .withMessage("currency field cannot be empty"),
  check("bank_code")
    .isString()
    .withMessage("bank_code must be of type string")
    .notEmpty()
    .withMessage("bank_code field cannot be empty"),
  check("bankName")
    .isString()
    .withMessage("bank_code must be of type string")
    .notEmpty()
    .withMessage("bank_code field cannot be empty"),
  check("currency")
    .isString()
    .withMessage("currency must be of type string")
    .notEmpty()
    .withMessage("currency field cannot be empty"),
  check("alias").optional(),
];

export const addCardWithStripeValidator = [
  check("card_holder")
    .isString()
    .withMessage("card_holder must be of type string")
    .notEmpty()
    .withMessage("card_holder field cannot be empty"),
  check("card_number")
    .isString()
    .withMessage("card_number must be of type string")
    .notEmpty()
    .withMessage("card_number field cannot be empty"),
  check("expire_month")
    .isNumeric()
    .withMessage("expire_month must be of type number")
    .notEmpty()
    .withMessage("expire_month field cannot be empty"),
  check("expire_year")
    .isNumeric()
    .withMessage("expire_year must be of type number")
    .notEmpty()
    .withMessage("expire_year field cannot be empty"),
  check("cvc")
    .isString()
    .withMessage("cvc must be of type string")
    .notEmpty()
    .withMessage("cvc field cannot be empty"),
  check("alias").optional(),
];

export const topUpAfricastalkingValidator = [
  check("amount")
    .isNumeric()
    .withMessage("amount must be of type number")
    .notEmpty()
    .withMessage("amount field cannot be empty"),
  check("currency")
    .isString()
    .withMessage("currency must be of type string")
    .notEmpty()
    .withMessage("currency field cannot be empty"),
  check("phoneNumber")
    .isString()
    .withMessage("phoneNumber must be of type string")
    .notEmpty()
    .withMessage("phoneNumber field cannot be empty"),
  check("level")
    .isString()
    .withMessage("level must be of type string")
    .notEmpty()
    .withMessage("level field cannot be empty"),
  check("reason")
    .optional()
    .isString()
    .withMessage("reason must be of type string"),
];
