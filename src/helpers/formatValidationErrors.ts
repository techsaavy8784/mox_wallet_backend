import { ValidationError } from "express-validator";

export const formatValidationErrors = (errors: ValidationError[]) => {
  let messageArray = errors.map((error, index, array) => {
    let message = error.msg;
    if (index + 1 != array.length) {
      message += "., ";
    }
    return message;
  });
  const messageString = convertValidationErrorsToString(messageArray);
  return messageString;
};

const convertValidationErrorsToString = (errors: string[]) => {
  let errorString = "";

  errors.forEach((errorValue) => {
    let errorValueWithoutPeriod = errorValue.split("., ")[0];
    if (errors.indexOf(errorValue) != errors.length - 1) {
      errorValueWithoutPeriod += ", ";
    }
    errorString += errorValueWithoutPeriod;
  });

  return errorString;
};
