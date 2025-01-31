import Notification, {
  NotificationDocument,
} from "../api/database/models/notification.model";
import { Types } from "mongoose";

class NotificationService {
  public static async getAll() {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    return notifications;
  }

  public static async getAllForSingleWallet(walletId: string) {
    const notifications = await Notification.find({ walletId }).sort({
      createdAt: -1,
    });
    return notifications;
  }

  public static async getSingle(notificationId: Types.ObjectId) {
    const notifications = await Notification.findById(notificationId);
    return notifications;
  }

  public static async addNotification(
    walletId: string,
    title: string,
    message: string
  ) {
    let notification = await new Notification({
      walletId: walletId,
      title: title,
      message: message,
    }).save();
    return notification;
  }

  public static async deleteNotification(id: string): Promise<any> {
    return await Notification.findByIdAndDelete(id);
  }

  public static async markNotificationAsRead(id: string): Promise<any> {
    return await Notification.findByIdAndUpdate(id, { isRead: true });
  }

  public static async bulkDelete(ids: string[]) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const bulkDelete = ids.map(async (each) => {
          const notification = await Notification.findById(each);
          if (notification) {
            await notification.deleteOne();
          }
        });
        await Promise.all(bulkDelete);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  public static async bulkMarkAsRead(ids: string[]) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const bulkDelete = ids.map(async (each) => {
          const notification = await Notification.findById(each);
          if (notification) {
            await notification.updateOne({ isRead: true });
          }
        });
        await Promise.all(bulkDelete);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default NotificationService;
