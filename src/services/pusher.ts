// import { pusher } from "../app";
// import { WalletDocument } from "../api/database/models/wallet.model";
import { BadRequestError } from "../core/ApiError";
import { Expo } from "expo-server-sdk";
let expo = new Expo();
import Pusher, { TriggerParams } from "pusher";

type INotification = {
  channels: string[];
  event: string;
  data: any;
  socketId?: TriggerParams;
};

export enum PusherEvent {
  TRANSACTIONS_UPDATED = "TRANSACTIONS_UPDATED",
  CARD_UPDATED = "CARD_UPDATED",
}

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID as string,
  key: process.env.PUSHER_KEY as string,
  secret: process.env.PUSHER_SECRET as string,
  cluster: process.env.PUSHER_CLUSTER as string,
  useTLS: true,
});

class PusherService {
  public static triggerPusherEvent(
    channelId: string | string[],
    event: PusherEvent,
    data: any
  ) {
    pusher.trigger(channelId, event, data);
  }
  public static triggerEvent(pushToken: string, body: string, data: any) {
    if (!Expo.isExpoPushToken(pushToken)) {
      new BadRequestError(
        `Push token ${pushToken} is not a valid Expo push token`
      );
    }

    let chunks = expo.chunkPushNotifications([
      {
        to: pushToken,
        sound: "default",
        body,
        data,
      },
    ]);
    let tickets: any[] = [];
    (async () => {
      for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error(error);
        }
      }
    })();

    let receiptIds = [];
    for (let ticket of tickets) {
      if (ticket.id) {
        receiptIds.push(ticket.id);
      }
    }

    let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    (async () => {
      for (let chunk of receiptIdChunks) {
        try {
          let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
          console.log(receipts);

          for (let receiptId in receipts) {
            let { status, details } = receipts[receiptId];
            if (status === "ok") {
              continue;
            } else if (status === "error") {
              console.error(
                `There was an error sending a notification status: ${status}`
              );
              if (details) {
                console.error(`The error code is ${details}`);
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
    })();
  }
  public static sendDataToUser({
    channels,
    event,
    data,
    socketId,
  }: INotification) {
    pusher.trigger(channels, event, data, socketId).catch((error) => {
      console.error(error);
    });
  }
}

export default PusherService;
