declare namespace Express {
  interface Request {
    validate: (
      args: import("validatorjs").Rules,
      locations?: string[],
      customMessages?: import("validatorjs").ErrorMessages
    ) => Promise<Response | void>;
    wallet?: import("../../api/database/models/wallet.model").WalletDocument;
    validated: () => any;
  }
  interface Response {
    advancedResults: (
      model: import("mongoose").Model<any>,
      populate?: string
    ) => Promise<any>;
  }
}
