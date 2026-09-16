import cloudinary from '../config/cloudinary.config';

export function subirImagenACloudinary(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder: 'play-n-seek/perfiles' }, (error, result) => {
            if (error || !result) {
                return reject(error);
            }
            resolve(result.secure_url);
        });
        uploadStream.end(buffer);
    });
}
