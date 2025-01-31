import paystack from "paystack";
import { BadRequestError } from "../core/ApiError";
import https from "https";

const { PAYSTACK_SECRET } = process.env;
const paystackClient = paystack(PAYSTACK_SECRET as string);

export enum TransferRecipientType {
  nuban = "nuban",
  mobile_money = "mobile_money",
  basa = "basa",
}

class PaystackService {
  static paystackOptions = async (path: string, method: string) => {
    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: path,
      method: method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
    };
    return options;
  };

  static charge = async (
    email: string,
    amount: number,
    reference: string,
    name: string,
    currency: string,
    callback_url?: string,
    addCard?: boolean
  ) => {
    try {
      const chargeObj: any = {
        email,
        amount: amount * 100,
        reference,
        name,
        callback_url,
        currency,
      };

      if (addCard) {
        chargeObj.channels = ["card"];
      }
      const payment = await paystackClient.transaction.initialize(chargeObj);
      console.log(payment);
      return {
        success: payment.status,
        completed: false,
        requiresVerification: false,
        link: payment?.data?.authorization_url,
        response: payment,
        message: payment.message,
      };
    } catch (error) {
      console.log("error with paystack", error);
      throw new BadRequestError(error as string);
    }
  };

  static fetchData = async (path: string, method: string, params?: string) => {
    const requestUrl = await this.paystackOptions(path, method);
    return new Promise((resolve, reject) => {
      const req = https.request(requestUrl, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve(JSON.parse(data));
        });
      });

      req.on("error", (error) => {
        reject(error);
      });
      if (params) {
        req.write(params);
      }
      req.end();
    });
  };

  static chargeAuthorization = async (
    email: string,
    amount: number,
    authorization_code: string,
    reference: string,
    currency: string,
    callback_url: string
  ) => {
    const params = JSON.stringify({
      authorization_code,
      email,
      amount: amount * 100,
      reference,
      currency,
      callback_url,
    });
    try {
      const payment: any = await this.fetchData(
        `/transaction/charge_authorization`,
        "POST",
        params
      );
      console.log(payment);
      return {
        success: payment.status,
        completed: payment.status,
        requiresVerification: false,
        link: null,
        response: payment,
        message: payment.message,
      };
    } catch (error) {
      console.log("error with paystack", error);
      throw new BadRequestError(error as string);
    }
  };

  static checkStatus = async (reference: string, expectedCurrency: string) => {
    try {
      const checkStatus: any = await this.fetchData(
        `/transaction/verify/${reference}`,
        "GET"
      );

      console.log(checkStatus);

      if (
        checkStatus.status === true &&
        checkStatus.data.currency === expectedCurrency
      ) {
        return { success: true, status: checkStatus };
      } else {
        return { success: false, status: checkStatus };
      }
    } catch (error: any) {
      console.log(error);
      throw new BadRequestError(error);
    }
  };

  static resolveAccountNumber = async (
    accountNumber: string,
    bank_code: string
  ) => {
    try {
      const resolveAccount: any = await this.fetchData(
        `/bank/resolve?account_number=${accountNumber}&bank_code=${bank_code}`,
        "GET"
      );

      if (
        resolveAccount.status === true &&
        resolveAccount.data.account_number === accountNumber
      ) {
        return { success: true, account: resolveAccount };
      } else {
        return { success: false, account: resolveAccount };
      }
    } catch (error: any) {
      console.log(error);
      throw new BadRequestError(error);
    }
  };

  static changeOTPStatus = async (action: boolean) => {
    try {
      const OTPstatus: any = await this.fetchData(
        `/transfer/${action ? "enable_otp" : "disable_otp"}`,
        "POST"
      );

      console.log(OTPstatus);

      if (OTPstatus.status === true) {
        return { success: true, status: OTPstatus };
      } else {
        return { success: false, status: OTPstatus };
      }
    } catch (error: any) {
      console.log(error);
      throw new BadRequestError(error);
    }
  };

  static completeOTPDisable = async (otp: string) => {
    const params = JSON.stringify({
      otp,
    });
    try {
      const complete: any = await this.fetchData(
        `/transfer/disable_otp_finalize`,
        "POST",
        params
      );

      return {
        success: complete.status,
        completed: true,
        requiresVerification: false,
        link: null,
        response: complete,
        message: complete.message,
      };
    } catch (error) {
      console.log("error with paystack", error);
      throw new BadRequestError(error as string);
    }
  };

  static createTransactionReceipt = async (
    type: TransferRecipientType,
    name: string,
    account_number: string,
    bank_code: string,
    currency: string,
    authorization_code?: string
  ) => {
    const params = JSON.stringify({
      account_number,
      type,
      name,
      bank_code,
      currency,
      authorization_code,
    });
    console.log(params);
    try {
      const receipt: any = await this.fetchData(
        `/transferrecipient`,
        "POST",
        params
      );

      return {
        success: receipt.status,
        completed: true,
        requiresVerification: false,
        link: null,
        response: receipt,
        message: receipt.message,
      };
    } catch (error) {
      console.log("error with paystack", error);
      throw new BadRequestError(error as string);
    }
  };

  static transferToWallet = async (
    reason: string,
    amount: string,
    recipient: string,
    reference: string,
    currency: string
  ) => {
    const params = JSON.stringify({
      source: "balance",
      reason,
      amount: parseFloat(amount) * 100,
      recipient,
      reference,
      currency,
    });
    try {
      const transfer: any = await this.fetchData(`/transfer`, "POST", params);

      console.log(transfer);

      return {
        success: transfer.status,
        completed: true,
        requiresVerification: false,
        link: null,
        response: transfer,
        message: transfer.message,
      };
    } catch (error) {
      console.log("error with paystack", error);
      throw new BadRequestError(error as string);
    }
  };

  static transactionRefund = async (transactionId: number) => {
    const params = JSON.stringify({
      transaction: transactionId,
    });
    try {
      const refund: any = await this.fetchData(`/refund`, "POST", params);

      return {
        success: refund.status,
        completed: true,
        requiresVerification: false,
        link: null,
        response: refund,
        message: refund.message,
      };
    } catch (error) {
      console.log("error with paystack", error);
      throw new BadRequestError(error as string);
    }
  };
}

export default PaystackService;
