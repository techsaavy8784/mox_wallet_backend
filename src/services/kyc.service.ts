import KYC from "../api/database/models/kyc.model";
import { Types } from "mongoose";

class KYCService {
  public static async getAll() {
    const kycs = await KYC.find().sort({
      createdAt: -1,
    });
    return kycs;
  }

  public static async getSingle(KYCId: string) {
    const kyc = await KYC.findById(KYCId);
    return kyc;
  }

  public static async getSingleForWallet(walletId: string) {
    const kyc = await KYC.findOne({ Wallet: walletId });
    return kyc;
  }

  public static async addKYC(walletId: string, kycData: any) {
    let kyc = await new KYC({
      Wallet: walletId,
      ...kycData,
    }).save();
    return kyc;
  }

  public static async deleteKYC(id: string): Promise<any> {
    return await KYC.findByIdAndDelete(id);
  }
}

export default KYCService;
