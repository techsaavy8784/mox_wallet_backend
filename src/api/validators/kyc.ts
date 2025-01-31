import { body, param, query } from "express-validator";
import { kycCountries } from "../../helpers/enums";
import { GENDER, KYCStatus } from "../../api/database/models/kyc.model";
const countries = [
  kycCountries.RWANDA,
  kycCountries.GHANA,
  kycCountries.NIGERIA,
  kycCountries.OTHER,
];

const status = [KYCStatus.APPROVED, KYCStatus.DECLINED];

const genders = [GENDER.MALE, GENDER.FEMALE, GENDER.OTHER];

export const kycStatusValidator = [
  body("status")
    .isString()
    .withMessage("status  must be the string")
    .isIn(status)
    .withMessage(`status must be ${status.join()}`)
    .notEmpty()
    .withMessage("status must be provided"),
];

export const adKycValidators = [
  body("gender")
    .isString()
    .withMessage("gender  must be the string")
    .isIn(genders)
    .withMessage(`gender must be ${genders.join()}`)
    .notEmpty()
    .withMessage("gender must be provided"),
  body("country")
    .isString()
    .withMessage("country  must be the string")
    .isIn(countries)
    .withMessage(`country must be ${countries.join()}`)
    .notEmpty()
    .withMessage("country must be provided"),
  body("phoneNumber")
    .isString()
    .withMessage("Phone number must be a string")
    .notEmpty()
    .withMessage("Phone number must be provided"),
  body("city")
    .isString()
    .withMessage("city must be a string")
    .notEmpty()
    .withMessage("city must be provided"),
  body("idNumber")
    .isString()
    .withMessage("id Number must be a string")
    .notEmpty()
    .withMessage("id Number must be provided"),
];
