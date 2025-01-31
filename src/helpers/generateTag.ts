import Vault from "../api/database/models/vault.model";
import crypto from "crypto";

const generateUniquenumber = (secretPhrase: string) => {
  const hash = crypto.createHash("sha256").update(secretPhrase).digest("hex");
  const hashNumber = parseInt(hash, 16);
  const uniqueNumber = hashNumber % 100000;
  return uniqueNumber.toString().padStart(5, "0");
};

export const generateTag = async (secretPhrase: string): Promise<number> => {
  let uniqueNumber: number | null = null;
  while (!uniqueNumber) {
    const tag = generateUniquenumber(secretPhrase);
    const vault = await Vault.findOne({ tag: parseInt(tag) });
    if (!vault) {
      uniqueNumber = parseInt(tag);
    }
  }
  return uniqueNumber;
};
