import { WithdrawfilterOptions } from "../api/validators/withdrawMethod";
import { BadRequestDataError, NotFoundError } from "../core/ApiError";
import WithdrawMethod from "../api/database/models/WithdrawMethod.model";
export class PayoutService {
  static async addWithdrawMethod(
    walletId: string,
    withdrawMethodData: any,
    currencyId?: string
  ) {
    return WithdrawMethod.create({
      ...withdrawMethodData,
      currency: currencyId,
      wallet: walletId,
    });
  }
  static async deleteWithDrawMethod(
    walletId: string,
    withdrawMethodId: string
  ) {
    const result = await WithdrawMethod.findOneAndDelete({
      _id: withdrawMethodId,
      wallet: walletId,
    });
    if (!result)
      throw new NotFoundError("Withdraw Method with that id not found");
    return result;
  }
  static async getSingleWithDrawMethod(
    walletId: string,
    withdrawMethodId: string
  ) {
    const result = await WithdrawMethod.findOne({
      _id: withdrawMethodId,
      wallet: walletId,
    }).populate("currency");
    if (!result)
      throw new NotFoundError("Withdraw Method with that id not found");
    return result;
  }
  static async getWithdrawMethods(
    walletId: string,
    forGateway: string,
    filterOptions: object = {}
  ) {
    return WithdrawMethod.find({
      wallet: walletId,
      gateway: forGateway,
      ...filterOptions,
    })
      .populate("currency")
      .sort({ createdAt: -1 });
  }
}
