const { AFRICASTALKING_SECRET, AFRICASTALKING_USERNAME } = process.env;

const credentials = {
  apiKey: AFRICASTALKING_SECRET as string,
  username: AFRICASTALKING_USERNAME as string,
};
const AfricasTalking = require("africastalking")(credentials);
import { BadRequestError } from "../core/ApiError";

const airtime = AfricasTalking.AIRTIME;

class AfricasTalkingService {
  static sendAirtime = async (
    currency: string,
    phoneNumber: string,
    amount: number
  ) => {
    try {
      const options = {
        maxNumRetry: 3,
        recipients: [
          {
            phoneNumber,
            amount: amount.toString(),
            currencyCode: currency,
          },
        ],
      };
      const response = await airtime.send(options);

      console.log(response);
      return {
        success: response?.responses[0]?.status === "Sent",
        completed: false,
        totalAmount: response?.totalAmount,
        response,
        message: response?.responses[0]?.errorMessage ?? response?.errorMessage,
      };
    } catch (error) {
      console.log("error with paystack", error);
      throw new BadRequestError(error as string);
    }
  };
}

export default AfricasTalkingService;
