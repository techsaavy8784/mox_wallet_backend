import fs from "fs";
import PDFDocument from "pdfkit";

export interface IIattachmentTransaction {
  transaction: string;
  sender: string;
  receiver: string;
  originalAmount: string;
  fee: string;
  proccesseAmount: string;
}
export interface IInvoice {
  receiver: {
    wallet: string;
    address: string;
    id: string;
  };
  transactions: IIattachmentTransaction[];
  status: string;
  reference: string;
}

export const createReceipt = async (
  wallet: string,
  address: string,
  id: any,
  path: string,
  transactions: IIattachmentTransaction[],
  reference: string,
  status: string
) => {
  return new Promise<void>((resolve, reject) => {
    let doc = new PDFDocument({ size: "A4", margin: 50 });
    const writeStream = fs.createWriteStream(path);

    // doc.on("end", () => {
    //   resolve();
    //   console.log("done generating pdf");
    // });
    doc.on("error", (error) => {
      console.log("error", error);
      reject(error);
    });

    doc.pipe(writeStream);

    const invoice = {
      receiver: {
        wallet,
        address,
        id,
      },
      transactions,
      status,
      reference,
    };

    generateHeader(doc);
    generateCustomerInformation(doc, invoice);
    generateInvoiceTable(doc, invoice);
    generateFooter(doc);

    doc.end();

    writeStream.on("finish", () => {
      console.log("PDF file created successfully.");
      resolve();
    });
    writeStream.on("error", (error) => {
      console.error("Error writing PDF to file:", error);
      reject(error);
    });
  });
};

function generateHeader(doc: PDFKit.PDFDocument) {
  doc
    .fillColor("#7b62fe")
    .fontSize(10)
    .text("Mox Wallet receipt", 50, 57, { align: "left" })
    .fillColor("#444444")
    .fontSize(8)
    .text("MOX", 200, 50, { align: "right" })
    .text("123 Main Street", 200, 65, { align: "right" })
    .text("Accra Ghana", 200, 80, { align: "right" })
    .moveDown();
}

function generateCustomerInformation(
  doc: PDFKit.PDFDocument,
  invoice: IInvoice
) {
  doc.fillColor("#444444").fontSize(8).text("Transaction Details", 50, 160);

  generateHr(doc, 185);

  const customerInformationTop = 200;

  doc
    .fontSize(6)
    .text("Reference:", 50, customerInformationTop)
    .font("Helvetica-Bold")
    .text(invoice.reference, 150, customerInformationTop)
    .font("Helvetica")
    .text("Date:", 50, customerInformationTop + 15)
    .text(formatDate(new Date()), 150, customerInformationTop + 15)
    .text("Status:", 50, customerInformationTop + 30)
    .fillColor("#198754")
    .text(invoice.status, 150, customerInformationTop + 30)

    .font("Helvetica-Bold")
    .fillColor("#444444")
    .text(invoice.receiver.wallet, 300, customerInformationTop)
    .font("Helvetica")
    .text(invoice.receiver.address, 300, customerInformationTop + 15)
    .moveDown();

  generateHr(doc, 252);
}

function generateInvoiceTable(doc: PDFKit.PDFDocument, invoice: IInvoice) {
  let i;
  const invoiceTableTop = 330;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    invoiceTableTop,
    "transaction",
    "sender",
    "receiver",
    "Amount",
    "Fee",
    "Total Amount"
  );
  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  for (i = 0; i < invoice.transactions.length; i++) {
    const transaction = invoice.transactions[i];
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      transaction.transaction,
      transaction.sender,
      transaction.receiver,
      transaction.originalAmount,
      transaction.fee.toString(),
      transaction.proccesseAmount
    );

    generateHr(doc, position + 20);
  }
}

function generateFooter(doc: PDFKit.PDFDocument) {
  doc.fontSize(6).text("Thank you for choosing Mox", 50, 720, {
    align: "center",
    width: 500,
  });
  generateHr(doc, 730);
  doc
    .fontSize(6)
    .text("Disclaimer:", 50, 740)
    .fontSize(4)
    .text(
      "The successful completion of your transfer indicates that the funds have been sent to the intended beneficiary. However, please note that this notification does not serve as confirmation of credit into the beneficiary's account. We would like to bring to your attention that due to the nature of the Internet and electronic communications, transactions may be subject to interruption, transmission blackout, delayed transmission, and incorrect data transmission. While we strive to provide a reliable and secure platform, we cannot guarantee the accuracy or timeliness of messages and transactions sent through Mox Wallet. Thank you for choosing Mox Wallet as your digital wallet solution.",
      50,
      750,
      {
        align: "left",
        width: 500,
      }
    );
}

function generateTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  transaction: string,
  sender: string,
  receiver: string,
  originalAmount: string,
  fee: string,
  proccessedAmount: string
) {
  doc
    .fontSize(6)
    .text(transaction, 50, y)
    .text(sender, 150, y)
    .text(receiver, 250, y)
    .text(originalAmount, 350, y, { width: 40, align: "right" })
    .text(fee, 400, y, { width: 40, align: "right" })
    .text(proccessedAmount, 0, y, { align: "right" });
}

function generateHr(doc: PDFKit.PDFDocument, y: number) {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}

function formatDate(date: Date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return year + "/" + month + "/" + day;
}
