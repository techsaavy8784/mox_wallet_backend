import axios, { AxiosResponse, AxiosError } from "axios";
import { BadRequestError } from "../core/ApiError";

class TransferWiseService {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.apiUrl = "https://api.transferwise.com/v1";
  }

  async createPayout(
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
    recipientName: string,
    recipientAccount: string
  ): Promise<AxiosResponse | AxiosError> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/payouts`,
        {
          source: sourceCurrency,
          target: targetCurrency,
          amount: amount,
          recipientName: recipientName,
          recipientAccount: recipientAccount,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.log("error with paystack", error);
      throw new BadRequestError(error as string);
    }
  }
}

// Example usage:
const apiKey = "";
const transferWiseService = new TransferWiseService(apiKey);

transferWiseService
  .createPayout("USD", "EUR", 100, "John Doe", "DE1234567890")
  .then((response) => {
    console.log("Payout created successfully:", response);
  })
  .catch((error) => {
    console.error("Error creating payout:", error);
  });
