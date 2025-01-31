import { v2 as cloudinary } from "cloudinary";
import { InternalError } from "../core/ApiError";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryUploader = cloudinary.uploader;

/**
 * @description This function uploads images to cloudinary
 * @param  {object} file The image uri to be uploaded
 * @param  {object} res http response object
 * @param {object} fields The request body
 * @returns {object} returns the response object cloudinary which contains the image url
 */
export const fileUpload = async (file: any, options: any = {}) => {
  try {
    const result = await cloudinaryUploader.upload(file.content, options);
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error: any) {
    throw new InternalError(error.message);
  }
};

export const deleteUpload = async (url: string) => {
  try {
    const tempe = url.split("/");
    const public_id = tempe[tempe.length - 1].split(".")[0];
    await cloudinaryUploader.destroy(public_id);
  } catch (error: any) {
    throw new InternalError(error.message);
  }
};
