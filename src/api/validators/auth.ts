import { check } from "express-validator";

export const loginValidator = [
  check("email")
    .isString()
    .withMessage("Email must be a string")
    .optional(),
  check("password")
    .isString()
    .withMessage("Password must be a string")
    .notEmpty()
    .withMessage("Password field cannot be empty"),
];

export const passwordValidator = [
  check("password")
    .notEmpty()
    .withMessage("Password field cannot be empty")
    .isString()
    .withMessage("Password must be a string"),
];
