import fs from "fs";
import path from "path";
import { Types } from "mongoose";
import { sign, verify } from "jsonwebtoken";
import { promisify } from "util";
import Logger from "./Logger";
import { BadTokenError } from "./ApiError";
import { WalletDocument } from "../api/database/models/wallet.model";

const pathToPriv = path.join(__dirname, "..", "..", "id_rsa_priv.pem");
const PRIV_KEY = fs.readFileSync(pathToPriv, "utf8");
const pathToPub = path.join(__dirname, "..", "..", "id_rsa_pub.pem");
const PUB_KEY = fs.readFileSync(pathToPub, "utf8");

export interface jwtInterface {
  sub: Types.ObjectId;
}

class Jwt {
  public static async issue(
    id: Types.ObjectId | WalletDocument,
    expiration = "1d"
  ): Promise<string> {
    try {
      // @ts-expect-error cannot see promisifys
      return await promisify(sign)({ sub: id }, PRIV_KEY, {
        expiresIn: expiration,
        algorithm: "RS256",
      });
    } catch (err) {
      Logger.error(err);
      throw new BadTokenError("Token could not be generated");
    }
  }

  public static async verify(token: string): Promise<jwtInterface> {
    try {
      // @ts-expect-error cannot see promisify
      return await promisify(verify)(token, PUB_KEY);
    } catch (err) {
      Logger.error(err);
      throw new BadTokenError();
    }
  }
}

export default Jwt;
