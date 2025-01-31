import sgMail from "@sendgrid/mail";
import { BadRequestResponse } from "../core/ApiResponse";
import fs from "fs";

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export interface IEmailOptions {
  email: string;
  subject: string;
  data?: any;
  templateId?: string;
  emailBody?: string;
  attachmentPath?: any;
}

const cleanUp = (filePath: string) => {
  fs.unlink(filePath, (err: any) => {
    if (err) {
      throw new BadRequestResponse(err);
    }

    console.log("file removed successfully");
  });
};

export const sendEmail = (options: IEmailOptions) => {
  const { email, subject, data, templateId, emailBody, attachmentPath } =
    options;

  console.log({ email, subject, data, templateId, emailBody });

  const sgOptions: any = {
    to: email,
    from: {
      email: process.env.SENDER_EMAIL,
      name: "MOX",
    },
    subject,
  };

  console.log(attachmentPath);

  if (attachmentPath) {
    const attachment = fs
      .readFileSync(`${__dirname}/${attachmentPath}`)
      .toString("base64");
    sgOptions.attachments = [
      {
        content: attachment,
        filename: "transaction.pdf",
        type: "application/pdf",
        disposition: "attachment",
      },
    ];
  }

  if (templateId) {
    sgOptions.templateId = templateId;
    sgOptions.dynamicTemplateData = data;
  }

  if (emailBody) {
    sgOptions.html = emailBody;
  }

  return sgMail
    .send(sgOptions)
    .then(() => {
      if (attachmentPath) {
        cleanUp(`${__dirname}/${attachmentPath}`);
      }
    })
    .catch((e) => {
      console.log("error", e);
    });
};
