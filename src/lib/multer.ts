import multer from "multer";
import Datauri from "datauri/parser";
import path from "path";

const storage = multer.memoryStorage();

const multerUploads = multer({ storage });

const dUri = new Datauri();

/**
 * @description This function converts the buffer to data url
 * @param {Object} file the file object
 * @returns {String} The data url from the string buffer
 */
const dataUri = (file: Express.Multer.File) =>
  dUri.format(path.extname(file.originalname).toString(), file.buffer);

export { multerUploads, dataUri };
