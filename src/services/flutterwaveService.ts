import { BadRequestError } from "../core/ApiError";

const Flutterwave = require("flutterwave-node-v3");
// const open = require("open");

export enum MobileMoneyType {
  Mpesa = "mpesa",
  Ghana = "ghana",
  Rwanda = "rwanda",
  Uganda = "uganda",
  Zambia = "zambia",
}

export interface MobileMoneyPayload {
  tx_ref: string;
  amount: string;
  currency: string;
  email: string;
  phone_number: string;
  fullname: string;
  type?: string;
  voucher?: string;
  network?: string;
  order_id?: string;
  redirect_url?: string;
  meta?: Record<string, string>;
  client_ip?: string;
  device_fingerprint?: string;
}

export interface PayloadCardTypes {
  card_number?: string;
  cvc?: string;
  expiry_month?: string;
  expiry_year?: string;
  currency: string;
  amount: string;
  redirect_url: string;
  fullname?: string;
  token?: string;
  email: string;
  phone_number: string;
  enckey: string;
  tx_ref: string;
}

class FlutterwaveService {
  private static flw = new Flutterwave(
    process.env.FLW_PUBLIC_KEY,
    process.env.FLW_SECRET_KEY
  );

  static chargeCard = async (
    payloadCard: PayloadCardTypes,
    tokenized: boolean
  ) => {
    try {
      const response = !tokenized
        ? await this.flw.Charge.card(payloadCard)
        : await this.flw.Tokenized.charge(payloadCard);

      console.log(response);

      if (response.status !== "success") {
        return { success: false, message: response.message };
      }
      if (response?.meta?.authorization.mode === "redirect") {
        var url = response.meta.authorization.redirect;
        return {
          success: true,
          completed: false,
          requiresVerification: false,
          link: url,
          response: response,
        };
      }

      return {
        success: true,
        completed: true,
        requiresVerification: true,
        link: null,
        response: response,
      };
    } catch (error: any) {
      console.log("error with flutter wave", error);
      throw new BadRequestError(error);
    }
  };

  static validateFLWPin = async (pin: number, payload: PayloadCardTypes) => {
    try {
      let payloadCard2: any = payload;
      payloadCard2.authorization = {
        mode: "pin",
        fields: ["pin"],
        pin: pin,
      };
      const reCallCharge = await this.flw.Charge.card(payloadCard2);

      if (reCallCharge.status !== "success") {
        return { success: false, message: reCallCharge.message };
      }

      return {
        success: true,
        completed: true,
        requiresVerification: true,
        link: null,
        response: reCallCharge,
      };
    } catch (error: any) {
      console.log(error);
      throw new BadRequestError(error);
    }
  };

  static validateFLWAVS = async (
    city: string,
    address: string,
    state: string,
    country: string,
    zipcode: string,
    payload: PayloadCardTypes
  ) => {
    try {
      let payloadCard2: any = payload;
      payloadCard2.authorization = {
        mode: "avs_noauth",
        city,
        address,
        state,
        country,
        zipcode,
      };
      const reCallCharge = await this.flw.Charge.card(payloadCard2);

      if (reCallCharge.status !== "success") {
        return { success: false, message: reCallCharge.message };
      }

      return {
        success: true,
        completed: true,
        requiresVerification: true,
        link: null,
        response: reCallCharge,
      };
    } catch (error: any) {
      console.log(error);
      throw new BadRequestError(error);
    }
  };

  static validateFLWTransaction = async (otp: string, flw_ref: string) => {
    try {
      const callValidate = await this.flw.Charge.validate({
        otp,
        flw_ref,
      });

      if (callValidate.status === "success") {
        return { success: true, callValidate };
      } else {
        return { success: false, callValidate };
      }
    } catch (error: any) {
      console.log(error);
      throw new BadRequestError(error);
    }
  };

  static checkStatus = async (
    transactionId: string,
    expectedAmount: number,
    expectedCurrency: string
  ) => {
    try {
      const checkStatus = await this.flw.Transaction.verify({
        id: transactionId,
      });

      console.log(checkStatus);

      if (
        checkStatus.data.status === "successful" &&
        checkStatus.data.amount === expectedAmount &&
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

  static mobileMoneyPay = async (
    type: MobileMoneyType,
    payload: MobileMoneyPayload
  ) => {
    try {
      let response;

      switch (type) {
        case MobileMoneyType.Mpesa:
          response = await this.flw.MobileMoney.mpesa(payload);
          break;
        case MobileMoneyType.Ghana:
          response = await this.flw.MobileMoney.ghana(payload);
          break;
        case MobileMoneyType.Rwanda:
          response = await this.flw.MobileMoney.rwanda(payload);
          break;
        case MobileMoneyType.Uganda:
          response = await this.flw.MobileMoney.uganda(payload);
          break;
        case MobileMoneyType.Zambia:
          response = await this.flw.MobileMoney.zambia(payload);
          break;
        default:
          throw new Error("Unsopported mobile money type");
      }

      console.log(response);
      return response;
    } catch (error) {
      console.log(error);
    }
  };

  static transferToBank = async () => {
    try {
      const payload = {
        account_bank: "044",
        account_number: "0690000040",
        amount: 5500,
        narration: "Akhlm Pstmn Trnsfr xx007",
        currency: "NGN",
        reference: "akhlm-pstmnpyt-rfxx007_PMCKDU_1",
        callback_url: "https://www.flutterwave.com/ng/",
        debit_currency: "NGN",
      };

      const response = await this.flw.Transfer.initiate(payload);
      console.log(response);
    } catch (error) {
      console.log(error);
    }
  };
}

export default FlutterwaveService;
