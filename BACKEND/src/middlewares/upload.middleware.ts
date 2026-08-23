import multer from 'multer';

// guardamos temporalmente en memoria porque de ahi
// lo subimos directo a Cloudinary sin necesitar un archivo fisico intermedio
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB maximo
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten archivos de imagen'));
        }
        cb(null, true);
    },
});
