"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subirImagenACloudinary = subirImagenACloudinary;
const cloudinary_config_1 = __importDefault(require("../config/cloudinary.config"));
function subirImagenACloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_config_1.default.uploader.upload_stream({ folder: 'play-n-seek/perfiles' }, (error, result) => {
            if (error || !result) {
                return reject(error);
            }
            resolve(result.secure_url);
        });
        uploadStream.end(buffer);
    });
}
