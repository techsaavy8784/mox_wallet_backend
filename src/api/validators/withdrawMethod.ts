import {
  WithdrawGateway,
  WithdrawMethodTypes,
} from "../database/models/WithdrawMethod.model";
import { BadRequestError } from "../../core/ApiError";
import SupportedCurrencyService from "../../services/SupportedCurrencyService";
import { body, param, query } from "express-validator";
import { MobileNumberProviders } from "../../helpers/enums";
const mobileProviders = [
  MobileNumberProviders.AIRTEL,
  MobileNumberProviders.MTN,
  MobileNumberProviders.VODAFONE,
];
export const addWithdrawMethodValidators = [
  body("type")
    .notEmpty()
    .withMessage("Withdraw type is required")
    .isString()
    .isIn([
      WithdrawMethodTypes.ACH,
      WithdrawMethodTypes.BANK,
      WithdrawMethodTypes.MOBILE_MONEY,
      WithdrawMethodTypes.NUBAN,
      WithdrawMethodTypes.ghipss,
      WithdrawMethodTypes.BASA,
      WithdrawMethodTypes.SWIFT,
      WithdrawMethodTypes.WIRE,
    ])
    .withMessage(
      "Withdraw  type must be ACH, Bank, Mobile Money, SWIFT, WIRE, ghipss"
    ),
  body("gateway")
    .notEmpty()
    .withMessage("gateway is required")
    .isString()
    .isIn([WithdrawGateway.STRIPE, WithdrawGateway.PAYSTACK])
    .withMessage("gateway  must be STRIPE or PAYSTACK"),
  body("alias")
    .notEmpty()
    .isString()
    .withMessage("Add alias of the withdraw method"),
  body("bankName")
    .if(body("gateway").equals(WithdrawGateway.PAYSTACK))
    .if(
      body("type").isIn([
        WithdrawMethodTypes.BANK,
        WithdrawMethodTypes.NUBAN,
        WithdrawMethodTypes.BASA,
        WithdrawMethodTypes.ghipss,
      ])
    )
    .isString()
    .withMessage("Bank name must be the string")
    .notEmpty()
    .withMessage("Bank name must be provided"),
  body("bank_code")
    .if(body("gateway").equals(WithdrawGateway.PAYSTACK))
    .if(
      body("type").isIn([
        WithdrawMethodTypes.BANK,
        WithdrawMethodTypes.NUBAN,
        WithdrawMethodTypes.BASA,
        WithdrawMethodTypes.ghipss,
      ])
    )
    .isString()
    .withMessage("Bank code must be the string")
    .notEmpty()
    .withMessage("Bank code must be provided"),
  body("account_number")
    .if(body("gateway").equals(WithdrawGateway.PAYSTACK))
    .if(
      body("type").isIn([
        WithdrawMethodTypes.BANK,
        WithdrawMethodTypes.MOBILE_MONEY,
        WithdrawMethodTypes.NUBAN,
        WithdrawMethodTypes.BASA,
        WithdrawMethodTypes.ghipss,
        WithdrawMethodTypes.SWIFT,
      ])
    )
    .isString()
    .withMessage("Account number must be the string")
    .notEmpty()
    .withMessage("Account number must be provided"),
  // body("mobileMoneyProvider")
  //   .if(body("type").equals(WithdrawMethodTypes.MOBILE_MONEY))
  //   .isString()
  //   .withMessage("Mobile money provider  must be the string")
  //   .isIn(mobileProviders)
  //   .withMessage(`Mobile Money Provider must be ${mobileProviders.join()}`)
  //   .notEmpty()
  //   .withMessage("Mobile money provider must be provided"),
  body("routingNumber")
    .if(body("type").isIn([WithdrawMethodTypes.ACH, WithdrawMethodTypes.WIRE]))
    .isString()
    .withMessage("Routing number must be a string")
    .notEmpty()
    .withMessage("Routing  number must be provided"),
  body("accountType")
    .if(body("type").isIn([WithdrawMethodTypes.ACH, WithdrawMethodTypes.WIRE]))
    .isString()
    .withMessage("Account type must a string for example savings")
    .notEmpty()
    .withMessage("Account type must be provided"),
  body("swiftCode")
    .if(body("type").equals(WithdrawMethodTypes.SWIFT))
    .isString()
    .withMessage("Account number must be the string")
    .notEmpty()
    .withMessage("Account number must be provided"),
  body("currency")
    .isString()
    .withMessage("currency must be of type string")
    .notEmpty()
    .withMessage("currency field cannot be empty"),
  body("country")
    .if(body("gateway").equals(WithdrawGateway.STRIPE))
    .isString()
    .withMessage("country must be a string")
    .notEmpty(),
  body("name")
    .isString()
    .withMessage("name must be of type string")
    .notEmpty()
    .withMessage("name field cannot be empty"),
];
export interface WithdrawfilterOptions {
  type: string;
  currency: string;
  alias: string;
}
export const filterOptionsValidator = [
  query("type").optional().isString(),
  query("currency")
    .optional()
    .custom(async (value) => {
      if (value) {
        const currency = await SupportedCurrencyService.getSingleBySymbol(
          value
        );
        if (!currency) {
          throw new BadRequestError("currency with that id is not found");
        }
      }
    })
    .notEmpty(),
  query("alias").optional().isString(),
];
export const ParamIdValidator = [
  param("id")
    .isString()
    .withMessage("Id must be a string")
    .isLength({
      max: 24,
      min: 24,
    })
    .withMessage("Id must be 24 character long")
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage("Id must be valid UUID"),
];
