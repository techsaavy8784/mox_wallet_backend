import Vault, { VaultDocument } from "../api/database/models/vault.model";
import { Types } from "mongoose";

class VaultService {
  public static async getAll() {
    const Vaults = await Vault.find().sort({ createdAt: -1 });
    return Vaults;
  }

  public static async getAllForSingleWallet(walletId: string) {
    const Vaults = await Vault.find({ walletId });
    return Vaults;
  }

  public static async getSingle(VaultId: Types.ObjectId) {
    const Vaults = await Vault.findById(VaultId);
    return Vaults;
  }

  public static async addVault(
    walletId: string,
    tag: number,
    address: string,
    makeGrandVault: boolean,
    accountId?: string
  ) {
    let vault = await new Vault({
      Wallet: walletId,
      isGrandVault: makeGrandVault,
      tag,
      address,
      account: accountId,
    }).save();
    return vault;
  }

  public static async deleteVault(id: string): Promise<any> {
    return await Vault.findByIdAndDelete(id);
  }
}

export default VaultService;
