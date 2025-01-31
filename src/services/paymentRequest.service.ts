import PaymentRequest from "../api/database/models/paymentRequest";

class PaymentRequestService {
  public static async getAll() {
    const paymentRequests = await PaymentRequest.find().sort({
      createdAt: -1,
    });
    return paymentRequests;
  }

  public static async getSingle(PaymentRequestId: string) {
    const paymentRequest = await PaymentRequest.findById(PaymentRequestId);
    return paymentRequest;
  }

  public static async getSentForWallet(walletId: string) {
    const paymentRequest = await PaymentRequest.find({ Wallet: walletId });
    return paymentRequest;
  }

  public static async getReceivedForWallet(walletId: string) {
    const paymentRequest = await PaymentRequest.find({ toWallet: walletId });
    return paymentRequest;
  }

  public static async addPaymentRequest(
    walletId: string,
    paymentRequestData: any
  ) {
    let paymentRequest = await new PaymentRequest({
      Wallet: walletId,
      ...paymentRequestData,
    }).save();
    return paymentRequest;
  }

  public static async deletePaymentRequest(id: string): Promise<any> {
    return await PaymentRequest.findByIdAndDelete(id);
  }
}

export default PaymentRequestService;
