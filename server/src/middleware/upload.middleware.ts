import multer from 'multer';

// Keep the uploaded file in memory (as a Buffer) rather than writing to
// disk — we immediately stream it to Cloudinary, so no local file needed.
const storage = multer.memoryStorage();

export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});