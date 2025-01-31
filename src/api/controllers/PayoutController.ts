import WithdrawMethod, {
  WithdrawMethodDocument,
  IWithdrawMethod,
  WithdrawGateway,
  WithdrawMethodTypes,
} from "../database/models/WithdrawMethod.model";
import { BadRequestResponse, SuccessResponse } from "../../core/ApiResponse";
import { Request, Response } from "express";
import { matchedData, validationResult } from "express-validator";
import asyncHandler from "../../helpers/asyncHandler";
import { PayoutService } from "../../services/Payout.service";
import { formatValidationErrors } from "../../helpers/formatValidationErrors";
import WalletService from "../../services/wallet_service";
import SupportedCurrencyService from "../../services/SupportedCurrencyService";
import Stripe from "stripe";
import { BadRequestError } from "../../core/ApiError";
import PaystackService from "../../services/paystackService.service";
import { AccountType } from "./wallet";
import Trade, {
  PaymentGatewayType,
  TradeStatus,
  TradeType,
} from "../../api/database/models/trade.model";
import { baseUrl } from "../../config";

const stripe = new Stripe(process.env.STRIPE_API_KEY as string, {
  apiVersion: "2020-08-27",
});

export const addWithdrawMethod = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const message = formatValidationErrors(errors.array());
        return new BadRequestResponse(message).send(res);
      }

      const wallet = req.wallet;
      if (!wallet) throw new BadRequestResponse("Invalid wallet").send(res);

      const withdrawMethodData = matchedData(req, {
        locations: ["body"],
      });

      const { currency } = req.body;

      let receipient;
      let data;

      if (withdrawMethodData.gateway === WithdrawGateway.PAYSTACK) {
        const SupportedCurrency =
          await SupportedCurrencyService.getSingleBySymbol(currency);

        if (!SupportedCurrency) {
          throw new BadRequestResponse("currency is not supported").send(res);
        }

        const currencyId = SupportedCurrency._id.toString();

        receipient = await WalletService.resolveRecipient(
          withdrawMethodData.type,
          withdrawMethodData.name,
          withdrawMethodData.bank_code,
          withdrawMethodData.account_number,
          currency,
          res,
          wallet._id
        );

        if (receipient.success) {
          withdrawMethodData.recipient_code =
            receipient.response?.data?.recipient_code;
        }
        data = await PayoutService.addWithdrawMethod(
          wallet?.id,
          withdrawMethodData,
          currencyId
        );
      }

      if (withdrawMethodData.gateway === WithdrawGateway.STRIPE) {
        const SupportedCurrency =
          await SupportedCurrencyService.getSingleBySymbol("USD");

        if (!SupportedCurrency) {
          throw new BadRequestResponse("currency is not supported").send(res);
        }
        const account = await stripe.accounts.create({
          type: "custom",
          country: withdrawMethodData.country,
          capabilities: {
            card_payments: {
              requested: true,
            },
            transfers: {
              requested: true,
            },
          },
        });

        // Generate an account link for the seller to complete their onboarding process
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: baseUrl,
          return_url: baseUrl,
          type: "account_onboarding",
        });

        data = await WithdrawMethod.create({
          gateway: WithdrawGateway.STRIPE,
          wallet: wallet._id,
          stripe_account_id: account.id,
          currency: SupportedCurrency._id,
          alias: withdrawMethodData.alias,
        });
        receipient = { account, accountLink };
      }

      return new SuccessResponse("Withdraw method added successfully", {
        receipient,
        method: data,
      }).send(res);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
);

export const getWalletWithdrawMethod = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const wallet = req.wallet;

    const filterOptions = matchedData(req, {
      locations: ["query"],
    }) as unknown as IWithdrawMethod & { currencyId: string };

    const forGateway = req.params.gateway;

    const gateways = ["PAYSTACK", "STRIPE"];

    if (!gateways.includes(forGateway)) {
      throw new BadRequestResponse("invalid Gateway").send(res);
    }

    const data = await PayoutService.getWithdrawMethods(
      wallet?._id,
      forGateway,
      filterOptions
    );
    return new SuccessResponse("Withdraw fetched successfully", data).send(res);
  }
);
export const removeWithdrawMethod = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const wallet = req.wallet;
    const withDrawMethodId = req.params.id;
    const data = await PayoutService.deleteWithDrawMethod(
      wallet?._id,
      withDrawMethodId
    );

    return new SuccessResponse(
      "Withdraw method removed successfully",
      data
    ).send(res);
  }
);
export const getSingleWithrawMethod = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = formatValidationErrors(errors.array());
      return new BadRequestResponse(message).send(res);
    }
    const wallet = req.wallet;
    const withDrawMethodId = req.params.id;
    const data = await PayoutService.getSingleWithDrawMethod(
      wallet?._id,
      withDrawMethodId
    );

    return new SuccessResponse(
      "Withdraw method fetched successfully",
      data
    ).send(res);
  }
);
